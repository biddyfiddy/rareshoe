import React from "react";
import "./App.css";
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Modal from '@mui/material/Modal';
import AppBar from '@mui/material/AppBar';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import blue from './img/blue.png';
import logo from './img/logo.png';
import yellow from './img/yellow.png';
import bg from './img/bg.png';
import red from './img/red.png';
import metamask from './img/metamask.png';
import banner from './img/banner.png';
import animation from './img/animation.mp4';
import "@fontsource/montserrat";
import {ethers} from "ethers"
import Box from '@mui/material/Box';
import {styled} from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

import {
    address as legacyAddress,
    abi as legacyAbi,
    bytecode as legacyByteCode,
} from './abi/legacy.json';
import {
    address as og1Address,
    abi as og1Abi,
    bytecode as og1ByteCode,
} from './abi/og1.json';
import {
    address as og2Address,
    abi as og2Abi,
    bytecode as og2ByteCode,
} from './abi/og2.json';
import {
    address as capsuleAddress,
    abi as capsuleAbi,
    bytecode as capsuleByteCode
} from './abi/capsules.json';

const inactiveImageStyle = {
    display: "inline",
    padding: "5px",
    width: "100px", height: "100px"
}

const activeImageStyle = {
    border: "5px solid #54585a",
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

// TODO: point to rareshoe.club
// TODO: deploy contracts
// TODO: verify the 25 quantity per contract id and token id
// TODO: get abi / bytecode for old Genesis and OG contracts, set token ids

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            burnModalOpen: false,
            mintModalOpen: false,
            accounts: null,
            mintQuantity: 0,
            mintError: undefined,
            mintTransactions: [],
            genesisTokenUris: [],
            ogTokenUris: [],
            amountGenesisBurned: 0,
            numCapsulesHeld: 0,
            allowedCapsules: 0,
            amountOgBurned: 0,
            amountBurned: 0,
            redCapsules: 0,
            blueCapsules: 0,
            yellowCapsules: 0,
            totalCapsules: 0,
            gettingBurned: false,
            gettingCapsules: false,
            minting: false,
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
        this.handleMintModalClose = this.handleMintModalClose.bind(this);
        this.handleMintModalOpen = this.handleMintModalOpen.bind(this);
        this.setView = this.setView.bind(this);
        this.decrementMintQuantity = this.decrementMintQuantity.bind(this);
        this.incrementMintQuantity = this.incrementMintQuantity.bind(this);
        this.openOGCollection = this.openOGCollection.bind(this);
        this.openGenesisCollection = this.openGenesisCollection.bind(this);
    }

    openGenesisCollection() {
        window.open("https://opensea.io/collection/rareshoe", '_blank', 'noopener,noreferrer');
    }

    openOGCollection() {
        window.open("https://opensea.io/collection/rareshoe-joshong", '_blank', 'noopener,noreferrer');
        window.open("https://rarible.com/rareshoe/created", '_blank', 'noopener,noreferrer');
    }

    decrementMintQuantity() {
        let { mintQuantity } = this.state
        this.setState({
            mintQuantity: mintQuantity === 0 ? 0 : mintQuantity - 1
        })
    }

    incrementMintQuantity() {
        let { mintQuantity,  allowedCapsules} = this.state
        this.setState({
            mintQuantity: mintQuantity ===  allowedCapsules ? allowedCapsules :  mintQuantity + 1
        })
    }

    handleClose() {
        this.setState({
            burnModalOpen: false,
        });
    }

    handleOpen() {
        this.setState({
            burnModalOpen: true
        });
    }

    handleMintModalOpen()  {
        this.setState({
            mintModalOpen: true,
        });
    }

    handleMintModalClose() {
        this.setState({
            mintModalOpen: false
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
            })
        }
    }

    async getOwnedCapsules() {
        const {accounts} = this.state;

        if (!accounts || accounts.length === 0) {
            return [];
        }

        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                address: accounts[0],

            })
        };

        let response = await fetch("/capsules", requestOptions)
        await response.json().then(result => {
            this.setState({
                redCapsules: result.red,
                blueCapsules: result.blue,
                yellowCapsules: result.yellow,
                totalCapsules: result.total
            })
        });
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
        let og1Contract = new ethers.ContractFactory(
            og1Abi,
            og1ByteCode,
            signer,
        );
        let og2Contract = new ethers.ContractFactory(
            og2Abi,
            og2ByteCode,
            signer,
        );
        let og1Tokens = await this.getBalance(og1Address, og1Contract, signer);
        let og2Tokens = await this.getBalance(og2Address, og2Contract, signer);
        return og1Tokens.concat(og2Tokens);
    }

    async getBalance(contractAddress, contractFactory, signer) {
        const {accounts} = this.state;

        if (!accounts || accounts.length === 0) {
            return [];
        }

        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contractAddress: contractAddress,
                address: accounts[0]
            })
        };

        let response = await fetch("/tokens", requestOptions).catch(err => {
            return [];
        })

        if (!response) {
            return [];
        }

        let tokens = await response.json();
        if (!tokens || !Array.isArray(tokens)) {
            return [];
        }
        let contract = contractFactory.attach(contractAddress);
        let tokenPromises = tokens.map(async tokenId => {
            let uri;
            if (contract.tokenURI) {
                uri = await contract.tokenURI(tokenId);
            } else if (contract.uri) {
                uri = await contract["uri(uint256)"](tokenId);
            }

            if (uri && uri.startsWith("https://api.opensea.io/api/v1/metadata/0x495f947276749Ce646f68AC8c248420045cb7b5e/")) {
                uri = `https://api.opensea.io/api/v1/metadata/0x495f947276749Ce646f68AC8c248420045cb7b5e/${tokenId}`
            }

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
            })
            if (response) {
                let json = await response.json();
                let hash;
                let imageUrl;
                if (json.image) {
                    let imageIpfs = json.image;
                    if (imageIpfs.endsWith("image.jpg") || imageIpfs.endsWith("image.jpeg")) {
                        let urlSuffix = imageIpfs.replace("ipfs://", "")
                        hash =  imageIpfs.replace("ipfs://ipfs/", "").replace("/image.jpeg", "");
                        imageUrl = `https://slimeball.mypinata.cloud/${urlSuffix}`;
                    } else if (imageIpfs.startsWith("https://lh3.googleusercontent.com")) {
                        imageUrl = imageIpfs;
                        hash = tokenId;
                    } else {
                        hash = imageIpfs.substring(imageIpfs.lastIndexOf("/") + 1);
                        imageUrl = `https://slimeball.mypinata.cloud/ipfs/${hash}`
                    }
                    // OpenSea Contract that doesn't use image url attribute : lh3.googleusercontent
                } else if (json.content) {
                    json.content.forEach(attribute => {
                        if (attribute['@type'] === 'IMAGE' && attribute.representation === 'PREVIEW') {
                            imageUrl = attribute.url;
                            hash = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
                        }
                    })
                }

                return {
                    tokenId: tokenId,
                    hash: hash,
                    imageUrl: imageUrl,
                    contractAddress: contractAddress,
                    imageActive: false
                }
            }
        });

        return Promise.all(tokenPromises);
    }

    makeOGActive(e) {
        const uri = e.target.id;
        const {ogTokenUris} = this.state;
        ogTokenUris.forEach(tokenUri => {
            if (tokenUri.hash === uri) {
                tokenUri.imageActive = !tokenUri.imageActive;
            }
        })
        this.setState(ogTokenUris);
    }

    makeGenesisActive(e) {
        const uri = e.target.id;
        const {genesisTokenUris} = this.state;
        genesisTokenUris.forEach(tokenUri => {
            if (tokenUri.hash === uri) {
                tokenUri.imageActive = !tokenUri.imageActive;
            }
        })
        this.setState(genesisTokenUris);
    }

    async mint() {
        this.setState({
            mintModalOpen: true,
            minting: true
        })

        const {accounts, mintQuantity} = this.state
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        const signer = ethersProvider.getSigner();

        let message = {
            toAddress: capsuleAddress,
            fromAddress: accounts[0],
            quantity: mintQuantity
        }

        let signature = await signer.signMessage(JSON.stringify(message));

        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                signature: signature
            })
        };

        let response = await fetch("/mintBurn", requestOptions)
        let hashes = await response.json();
        if (!hashes) {
            return;
        }

        let rshoePcontractFactory = new ethers.ContractFactory(
            capsuleAbi,
            capsuleByteCode,
            signer,
        );

        let contractInstance = rshoePcontractFactory.attach(capsuleAddress)

       let promises = hashes.txHashes.map(async hash => {

            const nonce = await signer.getTransactionCount()
            if (!nonce) {
                return [];
            }


            /*const gasFeePromise = await ethersProvider.getFeeData();
            if (!gasFeePromise) {
                return [];
            }
            const gasFee = gasFeePromise.gasPrice;
            if (!gasFee) {
                return [];
            }*/



            let rawTxn = await contractInstance.populateTransaction.burnMint(accounts[0], hash).catch(err => {
                console.log(err);
            });

            if (!rawTxn) {
                console.log("did not work")
            }
            /*, {
                gasPrice: gasFee,
                nonce: nonce
            })*/

            //console.log("Submitting transaction with gas price of:", ethers.utils.formatUnits(gasFee, "gwei") + " wei");
            let signedTxn = await signer.sendTransaction(rawTxn).catch(err => {
                console.log(err);
            });
            return signedTxn.wait().then(reciept => {
                if (reciept) {
                    return 'https://etherscan.io/tx/' + signedTxn.hash;
                } else {
                    console.log("Error submitting transaction")
                }
            }).catch(err => {
                console.log(err);
            });
        });

        let transactions = await Promise.all(promises).catch(err => {
            console.log(err);
        })
        this.setState({
            mintTransactions : transactions,
            minting: false
        })
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
        return json;
    }

    // Invoke 1155 safe transfer
    async burnOG() {
        const {ogTokenUris } = this.state;
        let activeTokens = ogTokenUris.filter(token => {
            return token.imageActive
        })

        if (activeTokens.length === 0) {
            return;
        }

        let ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        let signer = ethersProvider.getSigner()
        let og1Contract = new ethers.ContractFactory(
            og1Abi,
            og1ByteCode,
            signer,
        );
        let og2Contract = new ethers.ContractFactory(
            og2Abi,
            og2ByteCode,
            signer,
        );

        const {accounts } = this.state;

        let promises = activeTokens.map(async token => {
            let contract;
            if (token.contractAddress === og1Address) {
                contract = og1Contract.attach(token.contractAddress);
            } else {
                contract = og2Contract.attach(token.contractAddress);
            }
            return await contract["safeTransferFrom(address,address,uint256,uint256,bytes)"](accounts[0], capsuleAddress, token.tokenId, 1, "0x00");
        })

        Promise.all(promises).then(() => {
            this.handleOpen();
            this.setState({
                amountBurned: promises.length
            });
        }).catch(err => {
            console.log(err);
        })
    }

    async burnGenesis() {
        const {genesisTokenUris } = this.state;
        let activeTokens = genesisTokenUris.filter(token => {
            return token.imageActive
        })

        if (activeTokens.length === 0) {
            return;
        }

        let ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        let signer = ethersProvider.getSigner()
        let legacyContract = new ethers.ContractFactory(
            legacyAbi,
            legacyByteCode,
            signer,
        );

        const {accounts } = this.state;

        let contract = legacyContract.attach(legacyAddress)

        let promises = activeTokens.map(async token => {
            return await contract["safeTransferFrom(address,address,uint256)"](accounts[0], capsuleAddress, token.tokenId);
        })

        Promise.all(promises).then(() => {
            this.handleOpen();
            this.setState({
               amountBurned: promises.length
            });
        }).catch(err => {
            console.log(err);
        })
    }

    async setView(e) {
        let view = e.target.id;
        this.setState({
            view
        })

        if (view === "burn") {
            this.setState({
                gettingBurned: true
            })

            let genesisUris = await this.getGenesisRareShoeBalance();

            let ogTokenUris = await this.getOgRareShoeBalance();

            this.setState({
                genesisTokenUris: genesisUris,
                ogTokenUris: ogTokenUris,
                gettingBurned: false
            })
        } else if (view === "capsule") {
            this.setState({
                gettingCapsules: true
            })

            let response = await this.getAllowedCapsules();

            await this.getOwnedCapsules();

            this.setState({
                allowedCapsules: response.allowedCapsules,
                amountGenesisBurned: response.amountGenesisBurned,
                amountOgBurned: (response.amountOg1Burned + response.amountOg2Burned),
                numCapsulesHeld: response.capsulesHeld,
                gettingCapsules: false
            })
        }
    }

    render() {

        const {numCapsulesHeld, gettingCapsules, amountBurned, redCapsules,blueCapsules, yellowCapsules, totalCapsules, mintError, mintTransactions, minting, mintQuantity, mintModalOpen, burnModalOpen, allowedCapsules, accounts, genesisTokenUris, view, amountGenesisBurned, amountOgBurned, gettingBurned, ogTokenUris} = this.state;
        const ColorButton = styled(Button)(({theme}) => ({
            color: "lightgrey",
            backgroundColor: "#54585a",
            '&:hover': {
                backgroundColor: "#7b8387",
            },
            ":disabled": {
                color: 'lightgrey'
            }
        }));

        return (
            <div style={{backgroundColor: "black", color: "lightgray", lineHeight: "1.8", letterSpacing: "1px"}}>
                <AppBar position="static" style={{backgroundColor: "#54585a"}}>
                    <Toolbar>
                        <Typography variant="h6" component="div">
                            <ColorButton id="home" onClick={this.setView}>
                                <img src={logo} style={{width: "25px", height: "25px", paddingRight: "10px"}}/>Rare Shoe Machine</ColorButton>
                        </Typography>
                        <Typography variant="h6" component="div" style={{paddingLeft: "20px", paddingRight: "20px"}}>
                            <ColorButton id="burn" variant="text" style={{color: "lightgrey", fontSize: "14px"}}
                                         onClick={this.setView} disabled={!(accounts && accounts.length > 0)}>Burn</ColorButton>
                        </Typography>
                        <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                            <ColorButton id="capsule" variant="text" style={{color: "lightgrey", fontSize: "14px"}}
                                         onClick={this.setView} disabled={!(accounts && accounts.length > 0)}>Capsules</ColorButton>
                        </Typography>
                        {accounts && accounts.length > 0 ?
                            <Button style={{color: "lightgrey"}}>{accounts[0].substring(0, 10) + "..."}</Button>
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
                            You have burned {amountBurned} tokens.  Please allow time for it to be reflected on the Ethereum Main Net.
                        </Typography>
                    </Box>
                </Modal>

                <Modal
                    open={mintModalOpen}
                    onClose={this.handleMintModalClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <Box sx={style}>
                        <div style={{padding: '20px'}}>
                            <Typography style={{fontFamily: 'Montserrat', display: 'inline'}} id="modal-modal-title" variant="h6" component="h2">
                                Minting Capsules
                            </Typography>
                            <CloseIcon style={{float: 'right'}} onClick={this.handleMintModalClose}></CloseIcon>
                        </div>
                        {minting ?
                            <Typography style={{padding: "20px", fontFamily: 'Montserrat'}} id="modal-modal-description" sx={{ mt: 2 }}>
                                <CircularProgress color="inherit"></CircularProgress>
                            </Typography>

                            : <div> {mintError ? <Typography style={{padding: "20px", fontFamily: 'Montserrat'}} id="modal-modal-description" sx={{ mt: 2 }}>
                                    There was an error minting your capsules.  {mintError}
                                    </Typography> :
                            <Typography style={{padding: "20px", fontFamily: 'Montserrat'}} id="modal-modal-description" sx={{ mt: 2 }}>
                                You have minted {mintTransactions.length} token(s).  Please allow time for it to be reflected on the Ethereum Main Net.

                                <Typography style={{padding: "20px", fontFamily: 'Montserrat'}}>
                                {
                                    mintTransactions.map(tx => <p><a style={{fontSize: "10px"}} href={tx}>{tx.substring(tx.lastIndexOf("/") + 1)}</a></p>)
                                }</Typography>
                            </Typography>}

                            </div>}
                    </Box>
                </Modal>



                {view === "home" ?
                    <div>
                    {accounts && accounts.length > 0 ?

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
                            <ColorButton id="burn" variant="text" style={{padding: "16px", fontSize: "14px"}}
                                         onClick={this.openGenesisCollection}>Genesis Collection</ColorButton>
                            </div>
                            <hr style={{marginBottom: "40px", marginTop: "40px", width:"50%"}} color="#484848"/>
                            <h3 style={{textAlign: "center"}}>The Rare Shoe OG Collection</h3>
                            <p>This collection was released to early supporters of the project, prior to the Genesis collection.
                                It consists of 275 generative 3D shoes.</p>
                            <div style={{textAlign: "center", marginTop: "40px"}}>
                                <ColorButton id="burn" variant="text" style={{padding: "16px", fontSize: "14px"}}
                                        onClick={this.openOGCollection}>OG Collection</ColorButton>
                            </div>
                        </div>
                    </div> : <div style={{ backgroundPositionY: "-200px" , backgroundSize: "cover" , backgroundImage: `url(${bg})`}}>
                            <div style={{textAlign:"center", height: "1000px"}}>
                                <h1 style={{ margin: "0px", paddingTop: "100px"}}>👟</h1>
                                <h1 style={{ margin: "0px"}}>Rare Shoe Machine 2.0</h1>
                                <Button style={{paddingTop: "40px"}} color="inherit" onClick={this.connectMetamask}>
                                    <img src={metamask} style={{
                            width: "25px",
                            height: "25px",
                            paddingRight: "10px"
                        }}/>Connect MetaMask</Button></div></div>
                    } </div>
                         : view === "burn" ?
                        <div style={{width: "50%", marginLeft: "auto", marginRight: "auto", textAlign: "center"}}>
                            <h2 style={{marginTop: "50px", marginBottom: "10px"}}>Burn Rare Shoe(s)</h2>
                            <div style={{marginTop: "10px", marginBottom: "30px"}}>Click to select Genesis Token Shoes to convert them into Rare Shoe capsules.</div>
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
                                        <img id={tokenUri.hash} src={tokenUri.imageUrl}
                                             style={tokenUri.imageActive ? activeImageStyle : inactiveImageStyle}
                                             onClick={this.makeGenesisActive} loading="lazy"></img>) : <p>.</p>}
                                </div>

                                <ColorButton variant="text" style={{marginBottom: "10px", textAlign: "center"}}
                                             onClick={this.burnGenesis}>Burn</ColorButton>
                            </div>
                            <div style={{marginTop: "30px", marginBottom: "30px"}}>Click to select OG Token Shoes to convert them into Rare Shoe capsules.</div>
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
                                        <img id={tokenUri.hash} src={tokenUri.imageUrl}
                                             style={tokenUri.imageActive ? activeImageStyle : inactiveImageStyle}
                                             onClick={this.makeOGActive} loading="lazy"></img>) : <p>.</p>}
                                </div>

                                <ColorButton variant="text" style={{marginBottom: "10px", textAlign: "center"}}
                                             onClick={this.burnOG}>Burn</ColorButton>
                            </div>
                                </div>}
                        </div> :
                        <div style={{width: "50%", marginLeft: "auto", marginRight: "auto", textAlign: "center"}}>

                            <h2 style={{marginTop: "50px", marginBottom: "10px"}}>Mint Capsules</h2>

                            {gettingCapsules ?
                                <CircularProgress style={{marginTop: "20px"}} color="inherit"/> : <div>
                            <div style={{marginTop: "50px", marginBottom: "10px"}}>
                                You have burned {amountGenesisBurned} Genesis Token(s) and {amountOgBurned} OG Token(s).
                            </div>
                            <div style={{marginBottom: "10px"}}>
                                You have minted {numCapsulesHeld} capsule(s).
                            </div>
                            <div style={{marginBottom: "30px"}}>
                                You can mint up to {allowedCapsules} capsule(s).
                            </div>
                            <div>

                                <div
                                    style={{
                                        marginTop: "20px",
                                        marginBottom: "20px",
                                        padding: "5px",
                                        borderRadius: "20px",
                                        color: "lightgrey",
                                        backgroundColor: "#1e1e1e",
                                        boxShadow: "#494949 0px 0px 20px 6px"
                                    }}

                                >
                                    <div>
                                    <p>Select Amount of Capsules to Mint</p>
                                    <ArrowBackIosIcon onClick={this.decrementMintQuantity}/><div style={{marginLeft: "15px", marginRight: "15px", display : "inline"}}>{mintQuantity}</div><ArrowForwardIosIcon onClick={this.incrementMintQuantity}/>
                                    </div>
                                <ColorButton variant="text" style={{marginTop: "20px", textAlign: "center"}}
                                             onClick={this.mint} disabled={mintQuantity === 0}>Mint</ColorButton>
                                </div>
                            </div>
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
                                    }}>{blueCapsules} owned</span>
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
                                    }}>{yellowCapsules} owned</span>
                                </div>
                                <div style={{display: "inline"}}>
                                    <img src={red} alt="red" style={{
                                        borderRadius: "10px",
                                        boxShadow: "rgb(159 5 0) 0px 0px 20px 0px",
                                        width: "200px",
                                        height: "200px"
                                    }}/>
                                    <span style={{
                                        display: "block",
                                        paddingTop: "10px",
                                        paddingBottom: "10px"
                                    }}>{redCapsules} owned</span>
                                </div>
                            </div>
                        </div>}
                                </div>
                }
            </div>
        );
    }
}

export default App;
