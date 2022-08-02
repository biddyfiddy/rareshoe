import React from "react";
import "./App.css";
import CircularProgress from '@mui/material/CircularProgress';
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
import "@fontsource/montserrat";
import {ethers} from "ethers"
import Box from '@mui/material/Box';
import {styled} from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

import {
    address as rs20Address,
    abi as rs20Abi,
    bytecode as rs20ByteCode,
} from './abi/rs20.json';

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

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            mintModalOpen: false,
            accounts: null,
            mintError: undefined,
            mintTransactions: [],
            redCapsules: 0,
            blueCapsules: 0,
            yellowCapsules: 0,
            minting: false,
            view: "home"
        }
        this.connectMetamask = this.connectMetamask.bind(this);
        this.openGenesisCollection = this.openGenesisCollection.bind(this);
        this.openOGCollection = this.openOGCollection.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleOpen = this.handleOpen.bind(this);
        this.setView = this.setView.bind(this);
        this.mint = this.mint.bind(this);
    }

    openGenesisCollection() {
        window.open("https://opensea.io/collection/rareshoe", '_blank', 'noopener,noreferrer');
    }

    openOGCollection() {
        window.open("https://opensea.io/collection/rareshoe-joshong", '_blank', 'noopener,noreferrer');
        window.open("https://rarible.com/rareshoe/created", '_blank', 'noopener,noreferrer');
    }

    handleClose() {
        this.setState({
            mintModalOpen: false,
        });
    }

    handleOpen() {
        this.setState({
            mintModalOpen: true
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
                redCapsules: result.red ? result.red : 0,
                blueCapsules: result.blue ? result.blue : 0,
                yellowCapsules: result.yellow ? result.yellow : 0
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

    async setView(e) {
        let view = e.target.id;
        this.setState({
            view
        })

        if (view === "mint") {
            // no op
            await this.getOwnedCapsules();
        }
    }

    async mint() {
        const {accounts} = this.state;

        if (!accounts || accounts.length === 0) {
            return [];
        }

        this.setState({
            mintModalOpen: true,
            minting: true
        });

        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        const signer = ethersProvider.getSigner();

        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                walletAddress: accounts[0]
            })
        };

        let response = await fetch("/mint", requestOptions).catch(err => {
            this.setState({
                mintError: err.reason,
                minting: false
            });
        })

        if (!response || response.status !== 200) {
            return;
        }

        let json = await response.json();
        let rshoePcontractFactory = new ethers.ContractFactory(
            rs20Abi,
            rs20ByteCode,
            signer,
        );

        let contractInstance = rshoePcontractFactory.attach(rs20Address);

        let rawTxn = await contractInstance.populateTransaction.publicSale(json.blueAmount, json.redAmount, json.yellowAmount, json.nonce, json.hash, json.signature).catch(err => {
            this.setState({
                mintError: err.reason,
                minting: false
            });
        });

        if (!rawTxn) {
            return;
        }

        let signedTxn = await signer.sendTransaction(rawTxn).catch(err => {
            this.setState({
                mintError: err.reason,
                minting: false
            });
        });

        if (!signedTxn) {
            return;
        }

        let hashes = await signedTxn.wait().then(reciept => {
            if (reciept) {
                return 'https://etherscan.io/tx/' + signedTxn.hash;
            } else {
                this.setState({
                    mintError: "Transaction failed.",
                    minting: false
                });
            }
        }).catch(err => {
            this.setState({
                mintError: err.reason,
                minting: false
            })
        });


        this.setState({
            minting: false,
            hashes: hashes
        });
    }

    render() {

        const {
            hashes,
            mintError,
            minting,
            mintModalOpen,
            accounts,
            view,
            redCapsules,
            blueCapsules,
            yellowCapsules
        } = this.state;

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
                                <img src={logo} style={{width: "25px", height: "25px", paddingRight: "10px"}}/>Rare Shoe
                                Machine</ColorButton>
                        </Typography>
                        <Typography variant="h6" component="div" style={{paddingLeft: "20px", paddingRight: "20px"}}>
                            <ColorButton id="burn" variant="text" style={{color: "lightgrey", fontSize: "14px"}}
                                         onClick={this.setView} disabled>Burn</ColorButton>
                        </Typography>
                        <Typography variant="h6" component="div">
                            <ColorButton id="capsule" variant="text" style={{color: "lightgrey", fontSize: "14px"}}
                                         onClick={this.setView} disabled>Capsules</ColorButton>
                        </Typography>
                        <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                            <ColorButton id="mint" variant="text" style={{color: "lightgrey", fontSize: "14px"}}
                                         onClick={this.setView}>RS 2.0</ColorButton>
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
                    open={mintModalOpen}
                    onClose={this.handleClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <Box sx={style}>
                        <div style={{padding: '20px'}}>
                            <Typography style={{fontFamily: 'Montserrat', display: 'inline'}} id="modal-modal-title"
                                        variant="h6" component="h2">
                                Redeeming Capsules
                            </Typography>
                            <CloseIcon style={{float: 'right'}} onClick={this.handleClose}></CloseIcon>
                        </div>
                        {minting ? <CircularProgress color="inherit"></CircularProgress> :
                            <Typography style={{padding: "20px", fontFamily: 'Montserrat'}} id="modal-modal-description"
                                        sx={{mt: 2}}>
                                {hashes ? hashes.map(hash => {
                                    return <Typography>${hash}</Typography>
                                }) : <div>
                                    {mintError ? <Typography>{mintError}</Typography> :
                                        <Typography></Typography>}</div>}
                            </Typography>}
                    </Box>
                </Modal>

                {view === "home" ?
                    <div>
                        {accounts && accounts.length > 0 ?

                            <div style={{width: "50%", marginLeft: "auto", marginRight: "auto", textAlign: "center"}}>
                                <img style={{marginTop: "10px", width: "100%"}} src={banner}/>
                                <h2 style={{margin: "10px 0px 0px 0px"}}>The next generation of shoes is here!</h2>
                                <h4 style={{margin: "0px"}}>Participate in the Rare Shoe Machine</h4>

                                <hr style={{marginBottom: "40px", marginTop: "40px", width: "50%"}} color="#484848"/>

                                <div style={{textAlign: "left"}}>

                                    <p>Burn your Genesis and OG Rare Shoe to earn capsules. Capsules will be used to
                                        mint Rare Shoe 2.0 in the future.
                                        Genesis Holders will receive 1 capsule for every 1 NFTs burned.
                                        OG Holders will receive 2 capsule for every 1 NFT burned.</p>
                                    <hr style={{marginBottom: "40px", marginTop: "40px", width: "50%"}}
                                        color="#484848"/>
                                    <h3 style={{textAlign: "center"}}>The Rare Shoe Genesis Collection</h3>
                                    <p>
                                        This collection consists of 2,327 generative 3D shoes, created and designed by
                                        Sneaker lovers.
                                        This is much more than just a shoe, this is the future of Fashion NFT. The
                                        first-ever series
                                        of Generative collectible NFT sneaker artworks. Inspired by iconic silhouettes,
                                        the
                                        ongoing selection of crypto art drops will feature Rare Shoe’s reimagining of
                                        popular
                                        sneakers.
                                    </p>
                                    <div style={{textAlign: "center", marginTop: "40px"}}>
                                        <ColorButton id="burn" variant="text"
                                                     style={{padding: "16px", fontSize: "14px"}}
                                                     onClick={this.openGenesisCollection}>Genesis
                                            Collection</ColorButton>
                                    </div>
                                    <hr style={{marginBottom: "40px", marginTop: "40px", width: "50%"}}
                                        color="#484848"/>
                                    <h3 style={{textAlign: "center"}}>The Rare Shoe OG Collection</h3>
                                    <p>This collection was released to early supporters of the project, prior to the
                                        Genesis collection.
                                        It consists of 275 generative 3D shoes.</p>
                                    <div style={{textAlign: "center", marginTop: "40px"}}>
                                        <ColorButton id="burn" variant="text"
                                                     style={{padding: "16px", fontSize: "14px"}}
                                                     onClick={this.openOGCollection}>OG Collection</ColorButton>
                                    </div>
                                </div>
                            </div> : <div style={{
                                backgroundPositionY: "-200px",
                                backgroundSize: "cover",
                                backgroundImage: `url(${bg})`
                            }}>
                                <div style={{textAlign: "center", height: "1000px"}}>
                                    <h1 style={{margin: "0px", paddingTop: "100px"}}>👟</h1>
                                    <h1 style={{margin: "0px"}}>Rare Shoe Machine 2.0</h1>
                                    <Button style={{paddingTop: "40px"}} color="inherit" onClick={this.connectMetamask}>
                                        <img src={metamask} style={{
                                            width: "25px",
                                            height: "25px",
                                            paddingRight: "10px"
                                        }}/>Connect MetaMask</Button></div>
                            </div>
                        } </div>
                    :
                    <div>

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
                        <div style={{textAlign: "center"}}>
                            <ColorButton id="burn" variant="text" style={{padding: "16px", fontSize: "14px"}}
                                         onClick={this.mint}>Redeem</ColorButton>
                        </div>
                    </div>
                }
            </div>
        );
    }
}

export default App;
