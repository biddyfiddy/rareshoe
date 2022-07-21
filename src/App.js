import React from "react";
import "./App.css";
import CircularProgress from '@mui/material/CircularProgress';
import Modal from '@mui/material/Modal';
import AppBar from '@mui/material/AppBar';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import blue from './img/blue.png';
import yellow from './img/yellow.png';
import red from './img/red.png';
import metamask from './img/metamask.png';
import banner from './img/banner.png';
import animation from './img/animation.mp4';
import "@fontsource/montserrat";
import {ethers} from "ethers"
import Box from '@mui/material/Box';
import IceSkatingIcon from '@mui/icons-material/IceSkating';
import {styled} from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

import {
    address as legacyAddress,
    abi as legacyAbi,
    bytecode as legacyByteCode,
} from './abi/legacy.json';
import {
    address as ogAddress,
    abi as ogAbi,
    bytecode as ogByteCode,
} from './abi/og1.json';

import {
    address as capsuleAddress
} from './abi/capsules.json';

const inactiveImageStyle = {
    display: "inline",
    padding: "5px",
    width: "100px", height: "100px"
}

const activeImageStyle = {
    border: "5px solid #25253d",
    display: "inline",
    width: "100px", height: "100px"
}

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '500px',
    height: '600px',
    backgroundColor: 'black',
    textAlign: "center",
    color: 'lightgray',
    outline: 0,
    borderRadius: "10px",
    boxShadow: "lightgray 0px 0px 20px 0px"

};

// TODO : Fix modal number of tokens burned dialog
// TODO : Validate post inputs
// TODO : Add checks to all express items that could fail
// TODO : Update OG collection description
// TODO : Add ability to -/+ amount of capsules to mint
// TODO : Disable burn buttons when nothing is selected
// TODO : make images more visible when they are being loaded
// TODO : mint response modal
// TODO : Add fetch to get the amount of red / yellow / blue capsules held in the wallet
// TODO : Aggregate mint results and report failures back to UI
// TODO : Transaction to mint must be signed by owner
// TODO : update favicon
// TODO : loading state for capsules tab

// TEST TODO
// TODO: Create more tokens for testing for everyone's wallet
// TODO: find hosting website used earlier
// TODO: extract sensitive vars and add them to CI vars
// TODO: point to rareshoe.club
// TODO: verify all images work on the web


// OPS TODO
// TODO: deploy contracts
// TODO: get abi / bytecode for old Genesis and OG contracts

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            burnModalOpen: false,
            accounts: null,
            genesisTokenUris: [],
            ogTokenUris: [],
            amountGenesisBurned: 0,
            allowedCapsules: 0,
            amountOgBurned: 0,
            gettingBurned: false,
            view: "home"
        }
        this.connectMetamask = this.connectMetamask.bind(this);
        this.makeGenesisActive = this.makeGenesisActive.bind(this);
        this.makeOGActive = this.makeOGActive.bind(this);
        this.burnGenesis = this.burnGenesis.bind(this);
        this.burnOG = this.burnOG.bind(this);
        this.mint = this.mint.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleOpen = this.handleOpen.bind(this);
        this.setView = this.setView.bind(this);
    }

    handleClose() {
        this.setState({
            burnModalOpen: false
        });
    }

    handleOpen() {
        this.setState({
            burnModalOpen: true
        });
    }

    async componentDidMount() {
        const {ethereum} = window
        if (ethereum) {
            const accounts = await ethereum.request({
                method: 'eth_accounts',
            }).catch((error) => {
                console.error(error);
            });

            this.setState({
                accounts: accounts,
                gettingBurned: true
            })

            let genesisUris = await this.getGenesisRareShoeBalance();
            let amountGenesisBurned = await this.getBurnedTokenAmount(legacyAddress);
            let ogTokenUris = await this.getOgRareShoeBalance();
            let amountOgBurned = await this.getBurnedTokenAmount(ogAddress);
            let allowedCapsules = await this.getAllowedCapsules(ogAddress);

            this.setState({
                allowedCapsules,
                genesisTokenUris: genesisUris,
                ogTokenUris: ogTokenUris,
                amountGenesisBurned: amountGenesisBurned,
                amountOgBurned: amountOgBurned,
                gettingBurned: false
            })
        }
    }

    async connectMetamask() {
        const {ethereum} = window
        let accounts = await ethereum.request({method: 'eth_requestAccounts'});
        this.setState({
            accounts: accounts
        })
        window.location.reload();
    }

    async getGenesisRareShoeBalance() {
        let ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        let signer = ethersProvider.getSigner()
        let legacyContract = new ethers.ContractFactory(
            legacyAbi,
            legacyByteCode,
            signer,
        );
        return this.getBalance(legacyAddress, legacyContract, signer);
    }

    async getOgRareShoeBalance() {
        let ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        let signer = ethersProvider.getSigner()
        let legacyContract = new ethers.ContractFactory(
            ogAbi,
            ogByteCode,
            signer,
        );
        return this.getBalance(ogAddress, legacyContract, signer);
    }

    async getBalance(legacyAddress, legacyContract, signer) {
        const {accounts} = this.state;

        if (!accounts || accounts.length === 0) {
            return [];
        }

        let contract = legacyContract.attach(legacyAddress)

        let total = await contract.totalSupply().catch(err => {
            return;
        });

        let signerHash = await signer.getAddress();

        let tokenUris = []
        for (let i = 0; i < total; i++) {
            let owner = await contract.ownerOf(i).catch(err => {
                // no op
            });
            if (owner === signerHash) {
                let uri = await contract.tokenURI(i)

                const requestOptions = {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        uri
                    })
                };

                let response = await fetch("/token", requestOptions).catch(err => {
                    console.log(err);

                    // no op
                })
                if (response) {
                    let json = await response.json();

                    let imageUrl = json.image.replace("ipfs://", "https://ipfs.io/ipfs/");

                    tokenUris.push({
                        tokenId: i,
                        imageUrl: imageUrl,
                        imageActive: false
                    });
                }
            }
        }
        return tokenUris;
    }

    makeOGActive(e) {
        const uri = parseInt(e.target.id);
        const {ogTokenUris} = this.state;
        ogTokenUris.forEach(tokenUri => {
            if (tokenUri.tokenId === uri) {
                tokenUri.imageActive = !tokenUri.imageActive;
            }
        })
        this.setState(ogTokenUris);
    }

    makeGenesisActive(e) {
        const uri = parseInt(e.target.id);
        const {genesisTokenUris} = this.state;
        genesisTokenUris.forEach(tokenUri => {
            if (tokenUri.tokenId === uri) {
                tokenUri.imageActive = !tokenUri.imageActive;
            }
        })
        this.setState(genesisTokenUris);
    }

    async mint() {

    }

    async getAllowedCapsules() {
        const {accounts} = this.state;

        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                toAddress: capsuleAddress,
                fromAddress: accounts[0]
            })
        };

        let response = await fetch("/allowed", requestOptions)
        let json = await response.json();
        return json.allowed;
    }


    async getBurnedTokenAmount(legacyAddress) {
        const {accounts} = this.state;

        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                toAddress: capsuleAddress,
                fromAddress: accounts[0],
                contractAddress: legacyAddress
            })
        };

        let response = await fetch("/inquiry", requestOptions)
        let json = await response.json();
        return json.numBurns;
    }

    async burnOG() {
        const {ogTokenUris } = this.state;
        let activeTokens = ogTokenUris.filter(token => {
            return token.imageActive
        })
        let ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        let signer = ethersProvider.getSigner()
        let legacyContract = new ethers.ContractFactory(
            ogAbi,
            ogByteCode,
            signer,
        );
        await this.burnActiveTokens(activeTokens, legacyContract, ogAddress);
    }

    async burnGenesis() {
        const {genesisTokenUris } = this.state;
        let activeTokens = genesisTokenUris.filter(token => {
            return token.imageActive
        })
        let ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        let signer = ethersProvider.getSigner()
        let legacyContract = new ethers.ContractFactory(
            legacyAbi,
            legacyByteCode,
            signer,
        );
        await this.burnActiveTokens(activeTokens, legacyContract, legacyAddress);
    }

    async burnActiveTokens(activeTokens, legacyContract, legacyAddress) {
        const {accounts } = this.state;

        let contract = legacyContract.attach(legacyAddress)

        let promises = activeTokens.map(async token => {
            return await contract["safeTransferFrom(address,address,uint256)"](accounts[0], capsuleAddress, token.tokenId);
        })

        Promise.all(promises).then(() => {
            this.handleOpen();
        }).catch(err => {
            console.log(err);
        })
    }

    setView(e) {
        let view = e.target.id;
        this.setState({
            view
        })
    }

    render() {

        const {burnModalOpen, allowedCapsules, accounts, genesisTokenUris, view, amountGenesisBurned, amountOgBurned, gettingBurned, ogTokenUris} = this.state;
        const ColorButton = styled(Button)(({theme}) => ({
            color: "#fefefe",
            backgroundColor: "#25253d",
            '&:hover': {
                backgroundColor: "rgb(76 76 126)",
            },
        }));

        return (
            <div style={{backgroundColor: "black", color: "lightgray", lineHeight: "1.8", letterSpacing: "1px"}}>
                <AppBar position="static" style={{backgroundColor: "#25253d"}}>
                    <Toolbar>
                        <Typography variant="h6" component="div">
                            <ColorButton id="home" onClick={this.setView}><IceSkatingIcon
                                style={{paddingRight: "5px"}}/>Rare Shoe Machine</ColorButton>
                        </Typography>
                        <Typography variant="h6" component="div" style={{paddingLeft: "20px", paddingRight: "20px"}}>
                            <ColorButton id="burn" variant="text" style={{color: "#fefefe", fontSize: "14px"}}
                                         onClick={this.setView}>Burn</ColorButton>
                        </Typography>
                        <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                            <ColorButton id="capsule" variant="text" style={{color: "#fefefe", fontSize: "14px"}}
                                         onClick={this.setView}>Capsules</ColorButton>
                        </Typography>
                        {accounts && accounts.length > 0 ?
                            <Button color="inherit">{accounts[0].substring(0, 10) + "..."}</Button>
                            :
                            <Button color="inherit" onClick={this.connectMetamask}><img src={metamask} style={{
                                width: "25px",
                                height: "25px",
                                paddingRight: "10px"
                            }}/>Connect MetaMask</Button>
                        }

                    </Toolbar>
                </AppBar>

                <Modal
                    open={burnModalOpen}
                    onClose={this.handleClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <Box sx={style}>
                        <div style={{padding: '20px'}}>
                        <Typography style={{fontFamily: 'Montserrat', display: 'inline'}} id="modal-modal-title" variant="h6" component="h2">
                            Burn Complete
                        </Typography>
                        <CloseIcon style={{float: 'right'}} onClick={this.handleClose}></CloseIcon>
                        </div>
                        <video width="400" height="400" src={animation} type="video/mp4" autoPlay muted>
                        </video>
                        <Typography style={{padding: "20px", fontFamily: 'Montserrat'}} id="modal-modal-description" sx={{ mt: 2 }}>
                            You have burned X tokens.  Please allow time for it to be reflected on the Etherium Main Net.
                        </Typography>
                    </Box>
                </Modal>



                {view === "home" ?
                    <div style={{width: "50%", marginLeft: "auto", marginRight: "auto", textAlign: "center"}}>

                        <img style={{marginTop: "10px", width: "100%"}} src={banner}/>
                        <h2 style={{margin: "10px 0px 0px 0px"}}>The next generation of shoes is here!</h2>
                        <h4 style={{margin: "0px"}}>Participate in the Rare Shoe Machine</h4>

                        <hr style={{marginBottom: "40px", marginTop: "40px", width:"50%"}} color="#484848"/>

                        <div style={{textAlign: "left"}}>

                            <p>Burn your Genesis and OG Rare Shoe to earn capsules. Capsules will be used to mint Rare Shoe 2.0 in the future.
                            Genesis Holders will receive 1 capsule for every 1 NFTs burned.
                            OG Holders will receive 2 capsule for every 1 NFT burned.</p>
                            <hr style={{marginBottom: "40px", marginTop: "40px", width:"50%"}} color="#484848"/>
                            <h3 style={{textAlign: "center"}}>The Rare Shoe Genesis Collection</h3>
                            <p>
                                This collection consists of 2,327 generative 3D shoes, created and designed by Sneaker lovers.
                                This is much more than just a shoe, this is the future of Fashion NFT. The first-ever series
                                of Generative collectible NFT sneaker artworks. Inspired by iconic silhouettes, the
                                ongoing selection of crypto art drops will feature Rare Shoe’s reimagining of popular
                                sneakers.
                            </p>
                            <div style={{textAlign: "center", marginTop: "40px"}}>
                            <ColorButton id="burn" variant="text" style={{padding: "16px", backgroundColor: "#513a79", color: "lightgrey", fontSize: "14px"}}
                                         /*TODO onClick={this.setView}*/>Genesis Collection</ColorButton>
                            </div>
                            <hr style={{marginBottom: "40px", marginTop: "40px", width:"50%"}} color="#484848"/>
                            <h3 style={{textAlign: "center"}}>The Rare Shoe OG Collection</h3>
                            <p>This collection consists of XXXX</p>
                            <div style={{textAlign: "center", marginTop: "40px"}}>
                                <ColorButton id="burn" variant="text" style={{padding: "16px", backgroundColor: "#513a79", color: "lightgrey", fontSize: "14px"}}
                                    /*TODO onClick={this.setView}*/>OG Collection</ColorButton>
                            </div>
                        </div>
                    </div> : view === "burn" ?
                        <div style={{width: "50%", marginLeft: "auto", marginRight: "auto", textAlign: "center"}}>
                            <h2 style={{marginTop: "50px", marginBottom: "10px"}}>Burn Rare Shoe(s)</h2>
                            <div style={{marginTop: "10px", marginBottom: "30px"}}>Click below to convert your genesis tokens into Rare Shoe capsules.</div>
                            {gettingBurned ?
                                <CircularProgress style={{marginTop: "20px"}} color="inherit"/> : <div>


                            <div
                                style={{
                                    marginTop: "20px",
                                    padding: "5px",
                                    borderRadius: "20px",
                                    color: "lightgrey",
                                    backgroundColor: "#1e1e1e",
                                    boxShadow: "#494949 0px 0px 20px 6px"
                                }}

                            >
                                <div style={{marginBottom: "10px"}}>You have {genesisTokenUris.length} Genesis Rare Shoe(s).</div>
                                <div>
                                    {genesisTokenUris ? genesisTokenUris.map(tokenUri =>
                                        <img id={tokenUri.tokenId} src={tokenUri.imageUrl}
                                             style={tokenUri.imageActive ? activeImageStyle : inactiveImageStyle}
                                             onClick={this.makeGenesisActive} loading="lazy"></img>) : <p>.</p>}
                                </div>

                                <ColorButton variant="contained" style={{backgroundColor: "rgb(81, 58, 121)", textAlign: "center"}}
                                             onClick={this.burnGenesis}>Burn</ColorButton>
                            </div>
                            <div style={{marginTop: "30px", marginBottom: "30px"}}>Click below to convert your OG tokens into Rare Shoe capsules.</div>
                            <div
                                style={{
                                    marginTop: "20px",
                                    padding: "5px",
                                    borderRadius: "20px",
                                    color: "lightgrey",
                                    backgroundColor: "#1e1e1e",
                                    boxShadow: "#494949 0px 0px 20px 6px"
                                }}

                            >
                                <div style={{marginBottom: "10px"}}>You have {ogTokenUris.length} OG Rare Shoe(s).</div>
                                <div>
                                    {ogTokenUris ? ogTokenUris.map(tokenUri =>
                                        <img id={tokenUri.tokenId} src={tokenUri.imageUrl}
                                             style={tokenUri.imageActive ? activeImageStyle : inactiveImageStyle}
                                             onClick={this.makeOGActive} loading="lazy"></img>) : <p>.</p>}
                                </div>

                                <ColorButton variant="contained" style={{backgroundColor: "rgb(81, 58, 121)", textAlign: "center"}}
                                             onClick={this.burnOG}>Burn</ColorButton>
                            </div>
                                </div>}
                        </div> :
                        <div style={{width: "50%", marginLeft: "auto", marginRight: "auto", textAlign: "center"}}>

                            <h2 style={{marginTop: "50px", marginBottom: "10px"}}>Mint Capsules</h2>
                            <div style={{marginTop: "50px", marginBottom: "10px"}}>You have burned {amountGenesisBurned} Genesis Token(s) and {amountOgBurned} OG Token(s). You
                                can mint up to {allowedCapsules} capsule(s)
                            </div>
                            <ColorButton variant="contained" style={{textAlign: "center"}}
                                         onClick={this.mint}>Mint</ColorButton>
                            <div style={{
                                paddingTop: "20px",
                                paddingBottom: "40px",
                                display: "flex",
                                justifyContent: "center"
                            }}>
                                <div style={{display: "inline"}}>
                                    <img src={blue} alt="blue" style={{
                                        borderRadius: "10px",
                                        boxShadow: "rgb(175 253 253) 0px 0px 20px 0px",
                                        width: "200px",
                                        height: "200px"
                                    }}/>
                                    <span style={{
                                        display: "block",
                                        paddingTop: "10px",
                                        paddingBottom: "10px"
                                    }}>0 owned</span>
                                </div>
                                <div style={{display: "inline"}}>
                                    <img src={yellow} alt="yellow" style={{
                                        marginLeft: "20px",
                                        marginRight: "20px",
                                        borderRadius: "10px",
                                        boxShadow: "rgb(238 238 45) 0px 0px 20px 0px",
                                        width: "200px",
                                        height: "200px"
                                    }}/>
                                    <span style={{
                                        display: "block",
                                        paddingTop: "10px",
                                        paddingBottom: "10px"
                                    }}>0 owned</span>
                                </div>
                                <div style={{display: "inline"}}>
                                    <img src={red} alt="green" style={{
                                        borderRadius: "10px",
                                        boxShadow: "rgb(159 5 0) 0px 0px 20px 0px",
                                        width: "200px",
                                        height: "200px"
                                    }}/>
                                    <span style={{
                                        display: "block",
                                        paddingTop: "10px",
                                        paddingBottom: "10px"
                                    }}>0 owned</span>
                                </div>
                            </div>
                        </div>
                }
            </div>
        );
    }
}

export default App;
