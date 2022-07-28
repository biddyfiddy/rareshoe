const express = require("express");
const path = require("path")
const app = express();
const port = process.env.PORT || 3001;
const axios = require("axios")
const {ethers} = require("ethers");

const og1Json = require('./src/abi/og1.json');
const og2Json = require('./src/abi/og2.json');
const {abi: legacyAbi, legacyByteCode, address: legacyAddress} = require("./src/abi/legacy.json");

const og1Address = og1Json.address.toLowerCase();
const og1TokenIds = og1Json.tokenIds;

const capsulesJson = require('./src/abi/capsules.json');

const capsulesAddress = capsulesJson.address.toLowerCase();
const capsulesAbi = capsulesJson.abi;
const capsulesBytecode = capsulesJson.bytecode;

const redJson = require('./src/capsules/red.json');
const blueJson = require('./src/capsules/blue.json');
const yellowJson = require('./src/capsules/yellow.json');
const {address: capsuleAddress} = require("./src/abi/capsules.json");


const og2Address = require('./src/abi/og2.json').address.toLowerCase();
const og2TokenIds = og2Json.tokenIds;

const API_KEY = process.env.ETHER_API_KEY;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const WALLET_KEY = process.env.WALLET_KEY;
const ETHER_NETWORK = process.env.ETHER_NETWORK;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

const config = {
    headers: {
        'Content-Type': 'application/json',
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_KEY,
        "Host": "api.pinata.cloud"
    }
}

const getAllowedCapsules = async (toAddress, fromAddress) => {
    let genesisBurned = await getNumBurned(toAddress, fromAddress, legacyAddress.toLowerCase());
    let og1Burned = await getNumOgBurned(toAddress, fromAddress, og1Address.toLowerCase());
    let og2Burned = await getNumOgBurned(toAddress, fromAddress, og2Address.toLowerCase());
    let numCapsulesHeld = await getNumHeld(capsulesAddress, capsulesAbi, fromAddress);

    let numGenesisBurned = 0;
    if (genesisBurned) {
        numGenesisBurned = genesisBurned.numBurns;
    }
    let numOg1Burned = 0;
    if (og1Burned) {
        numOg1Burned = og1Burned.numBurns;
    }
    let numOg2Burned = 0;
    if (og2Burned) {
        numOg2Burned = og2Burned.numBurns;
    }
    return new Promise((resolve, reject) => {
        resolve({
            allowedCapsules: (numGenesisBurned + (numOg1Burned * 2) + (numOg2Burned * 2) - numCapsulesHeld),
            capsulesHeld: parseInt(numCapsulesHeld),
            amountGenesisBurned: numGenesisBurned,
            amountOg1Burned: numOg1Burned,
            amountOg2Burned: numOg2Burned
        });
    }).catch(err => {
        console.log(err);
    });
}

const getNumCapsulesAndTypes = async (address) => {
    let provider = new ethers.providers.EtherscanProvider(ETHER_NETWORK, API_KEY);
    const contract = new ethers.Contract(capsulesAddress, capsulesAbi, provider);
    let tokens = await getOwnedTokens(capsulesAddress, address);
    let red = 0;
    let yellow = 0;
    let blue = 0;

    let promises = tokens.map(async token => {
        let uri = await contract.tokenURI(token)
        uri = uri.replace("ipfs://", "https://slimeball.mypinata.cloud/ipfs/");

        return await axios.get(uri, {
            headers: {
                'Content-Type': 'application/json',
                "pinata_api_key": PINATA_API_KEY,
                "pinata_secret_api_key": PINATA_SECRET_KEY,
                "Host": "slimeball.mypinata.cloud"
            }
        }).then(response => {
            let data = response.data;
            let color = data.color;
            if (color) {
                if (color === "red") {
                    red++;
                } else if (color === "blue") {
                    blue++;
                } else if (color === "yellow") {
                    yellow++;
                }
            }
        }).catch(err => {
            console.log(err);
        });

    })

    await Promise.all(promises).catch(err => console.log(err));

    return new Promise((resolve, reject) => {
        resolve({
            "red": red,
            "yellow": yellow,
            "blue": blue,
            "total": red + yellow + blue
        });
    });
};

const getNumOgBurned = async (toAddress, fromAddress, contractAddress) => {
    console.log(`Getting amount of ${contractAddress} burned for ${toAddress}`);
    let network = ETHER_NETWORK === 'mainnet' ? '' : `-${ETHER_NETWORK}`;

    return axios.get(`https://api${network}.etherscan.io/api?module=account&action=token1155tx&address=${toAddress}&startblock=0&endblock=999999999&sort=asc&apikey=${API_KEY}`).then(response => {
        let responseData = response.data;
        let burns = responseData.result;
        let numBurns = 0;
        burns.forEach(burn => {
            if (burn.contractAddress === og1Address) {
                if (og1TokenIds.includes(burn.tokenID) && burn.from === fromAddress && burn.to === toAddress && contractAddress === burn.contractAddress) {
                    numBurns++;
                }
            } else if (burn.contractAddress === og2Address) {
                if (og2TokenIds.includes(burn.tokenID) && burn.from === fromAddress && burn.to === toAddress && contractAddress === burn.contractAddress) {
                    numBurns++;
                }
            } else if (burn.from === fromAddress && burn.to === toAddress && contractAddress === burn.contractAddress) {
                numBurns++;
            }
        })
        return {
            numBurns: numBurns
        };
    }).catch(err => {
        console.log(err);
    });
}

const getNumBurned = async (toAddress, fromAddress, contractAddress) => {
    console.log(`Getting amount of ${contractAddress} burned for ${toAddress}`);
    let network = ETHER_NETWORK === 'mainnet' ? '' : `-${ETHER_NETWORK}`;

    return axios.get(`https://api${network}.etherscan.io/api?module=account&action=tokennfttx&address=${toAddress}&startblock=0&endblock=999999999&sort=asc&apikey=${API_KEY}`).then(response => {
        let responseData = response.data;
        let burns = responseData.result;
        let numBurns = 0;
        burns.forEach(burn => {
            if (burn.contractAddress === og1Address) {
                if (og1TokenIds.includes(burn.tokenID) && burn.from === fromAddress && burn.to === toAddress && contractAddress === burn.contractAddress) {
                    numBurns++;
                }
            } else if (burn.contractAddress === og2Address) {
                if (og2TokenIds.includes(burn.tokenID) && burn.from === fromAddress && burn.to === toAddress && contractAddress === burn.contractAddress) {
                    numBurns++;
                }
            } else if (burn.from === fromAddress && burn.to === toAddress && contractAddress === burn.contractAddress) {
                numBurns++;
            }
        })
        return {
            numBurns: numBurns
        };
    }).catch(err => {
        console.log(err);
    });
};

const getOwnedOgTokens = async (contractAddress, address) => {
    let network = ETHER_NETWORK === 'mainnet' ? '' : `-${ETHER_NETWORK}`;

    return axios.get(`https://api${network}.etherscan.io/api?module=account&action=token1155tx&contractaddress=${contractAddress}&address=${address}&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=${API_KEY}`).then(response => {
        let responseData = response.data;
        let tokens = responseData.result;

        let tokenId = [];
        if (!tokens) {
            return tokenId;
        }

        tokens.forEach(token => {
            if (token.to === address.toLowerCase()) {
                if (token.contractAddress === og1Address && og1TokenIds.includes(token.tokenID)) {
                    tokenId.push(token.tokenID);
                } else if (token.contractAddress === og2Address && og2TokenIds.includes(token.tokenID)) {
                tokenId.push(token.tokenID);
                }
            }
        })

        tokens.forEach(token => {
            if (token.from === address.toLowerCase()) {
                if (token.contractAddress === og1Address && og1TokenIds.includes(token.tokenID)) {
                    tokenId.splice(tokenId.indexOf(token.tokenID), 1);
                } else if (token.contractAddress === og2Address && og2TokenIds.includes(token.tokenID)) {
                    tokenId.splice(tokenId.indexOf(token.tokenID), 1);
                }

            }
        })

        return tokenId;
    }).catch(err => {
        console.log(err);
    });
};

const getOwnedTokens = async (contractAddress, address) => {
    let network = ETHER_NETWORK === 'mainnet' ? '' : `-${ETHER_NETWORK}`;

    return axios.get(`https://api${network}.etherscan.io/api?module=account&action=tokennfttx&contractaddress=${contractAddress}&address=${address}&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=${API_KEY}`).then(response => {
        let responseData = response.data;
        let tokens = responseData.result;

        let tokenId = [];
        if (!tokens) {
            return tokenId;
        }
        tokens.forEach(token => {
            if (token.to === address) {
                tokenId.push(token.tokenID);
            }
        })

        tokens.forEach(token => {
            if (token.from === address) {
                tokenId.splice(tokenId.indexOf(token.tokenID), 1);
            }
        })

        return tokenId;
    }).catch(err => {
        console.log(err);
    });
}

const getNumHeld = async (contractAddress, contractAbi, walletAddress) => {
    let provider = new ethers.providers.EtherscanProvider(ETHER_NETWORK, API_KEY);
    const contract = new ethers.Contract(contractAddress, contractAbi, provider);

    return await contract.balanceOf(walletAddress).then(data => {
        return data.toString();
    }).catch(err => {
        console.log(err);
    });
}

const getRandomCapsuleColor = () => {
    const randomNumber = Math.floor(Math.random() * 3);
    let nftJson;
    switch (randomNumber) {
        // Red
        case 0:
            nftJson = redJson;
            break;
        // Blue
        case 1:
            nftJson = blueJson;
            break;
        // Yellow
        case 2:
            nftJson = yellowJson;
            break;
    }
    return nftJson;
}

const pinDataToPinata = async (nftJson) => {
    console.log("Pinning data to pinata")
    const pinataPayload = {
        "pinataOptions": {
        "cidVersion": 1
    },
        "pinataMetadata": {
        "name": Date.now().toString()
    },
        "pinataContent": nftJson
    }


    return axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", pinataPayload, config).then(response => {
        if (response && response.data && response.data.IpfsHash) {
            console.log(`Transaction hashed to ipfs at ${response.data.IpfsHash}`)
            return response.data.IpfsHash;
        } else {
            console.log('Transaction could not be hashed')
        }
    }).catch(error => {
        console.log(error);
    })
};

app.post("/tokens", async (req, res) => {
    const body = req.body
    if (!body) {
        res.status(500).json({
            message: "No post body"
        })
        return;
    }

    const contractAddress = body.contractAddress;
    if (!contractAddress) {
        res.status(500).json({
            message: "No Contract Address in post body"
        })
        return;
    }
    const address = body.address;
    if (!address) {
        res.status(500).json({
            message: "No Address in post body"
        })
        return;
    }

    let tokens;
    if (contractAddress === legacyAddress) {
        tokens = await getOwnedTokens(contractAddress, address);
    } else {
        tokens = await getOwnedOgTokens(contractAddress, address);
    }
    if (tokens) {
        res.status(200).json(tokens)
    } else {
        res.status(500).json({ message : "Could not get owned tokens"})
    }
});

app.post("/token", async (req, res) => {
    const body = req.body
    if (!body) {
        res.status(500).json({
            message: "No post body"
        })
        return;
    }
    const uri = body.uri;
    if (!uri) {
        res.status(500).json({
            message: "No URI in post body"
        })
        return;
    }

    let uriFixed;
    if (uri.indexOf("ipfs://ipfs/") > -1) {
        uriFixed = uri.replace("ipfs://ipfs/", "https://slimeball.mypinata.cloud/ipfs/");
    } else if (uri.indexOf("ipfs://") > -1) {
        uriFixed = uri.replace("ipfs://", "https://slimeball.mypinata.cloud/ipfs/");
    } else {
        uriFixed = uri
    }

    await axios.get(uriFixed).then(response => {
        return res.status(200).json(response.data)
    }).catch(
        function (error) {
            console.log(error)
            res.status(500).json({
                message: "Could not get information for token"
            })

        }
    )
});

app.post("/capsules", async (req, res) => {
    const body = req.body
    if (!body) {
        res.status(500).json({
            message: "No post body"
        })
        return;
    }

    const address = body.address.toLowerCase()
    if (!address) {
        res.status(500).json({
            message: "No address supplied"
        })
        return;
    }

    let response = await getNumCapsulesAndTypes(address);
    if (response) {
        res.status(200).json(response);
    } else {
        res.status(500);
    }
});

app.post("/allowed", async (req, res) => {
    const body = req.body
    if (!body) {
        res.status(500).json({
            message: "No post body"
        })
        return;
    }

    const toAddress = body.toAddress.toLowerCase()
    const fromAddress = body.fromAddress.toLowerCase()
    if (!toAddress || !fromAddress) {
        res.status(500).json({
            message: "Malformed post body"
        })
        return;
    }
    const allowed = await getAllowedCapsules(toAddress, fromAddress);
    if (allowed) {
        res.status(200).json(allowed);
    } else {
        res.status(200).json({
            allowedCapsules: 0,
            amountGenesisBurned: 0,
            amountOg1Burned: 0,
            amountOg2Burned: 0,
            capsulesHeld: 0,
        });
    }
});

app.post("/mint", async (req, res) => {
    const body = req.body
    if (!body) {
        res.status(500).json({
            message: "No post body"
        })
        return;
    }

    let message = body.message;
    if (!message || !message.toAddress || !message.fromAddress || !message.quantity) {
        return res.status(500).json("Request was malformed")
    }

    let signature = body.signature
    let address

    try {
        address = ethers.utils.verifyMessage(JSON.stringify(message), signature)
    } catch(err){
        return res.status(401).json("Could not verify signature.  Are you being a bad boy?")
    }

    if (address.toLowerCase() !== message.fromAddress.toLowerCase()) {
        return res.status(401).json("Could not verify signature.  Are you being a bad boy?")
    }

    const toAddress = message.toAddress.toLowerCase()
    const fromAddress = message.fromAddress.toLowerCase()
    const quantity = message.quantity;
    if (!toAddress || !fromAddress || !quantity) {
        res.status(500).json({
            message: "Malformed post body"
        })
        return;
    }

    hashes = [];
    for (let i = 0; i < quantity; i++) {

        const nftJson = await getRandomCapsuleColor();

        const tokenUri = await pinDataToPinata(nftJson);
        if (!tokenUri) {
            continue;
        }

        hashes.push(`ipfs://${tokenUri}`);

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.status(200).json({
        txHashes: hashes
    })

});

app.post("/mintBurn", async (req, res) => {
    const body = req.body
    if (!body) {
        res.status(500).json({
            message: "No post body"
        })
        return;
    }

    let message = body.message;
    if (!message || !message.toAddress || !message.fromAddress || !message.quantity) {
        return res.status(500).json("Request was malformed")
    }

    let signature = body.signature
    let address

    try {
        address = ethers.utils.verifyMessage(JSON.stringify(message), signature)
    } catch(err){
        return res.status(401).json("Could not verify signature.  Are you being a bad boy?")
    }

    if (address.toLowerCase() !== message.fromAddress.toLowerCase()) {
        return res.status(401).json("Could not verify signature.  Are you being a bad boy?")
    }

    const toAddress = message.toAddress.toLowerCase()
    const fromAddress = message.fromAddress.toLowerCase()
    const quantity = message.quantity;
    if (!toAddress || !fromAddress || !quantity) {
        res.status(500).json({
            message: "Malformed post body"
        })
        return;
    }

    // Check if wallet can mint:
    // Amount burned 1:1 Genesis and 1:2 OG
    // Amount already held
    // Held + Burned must be less than the requested quantity.
    let genesisBurned = await getNumBurned(toAddress, fromAddress, legacyAddress.toLowerCase());
    let og1Burned = await getNumOgBurned(toAddress, fromAddress, og1Address.toLowerCase());
    let og2Burned = await getNumOgBurned(toAddress, fromAddress, og2Address.toLowerCase());
    let numCapsulesHeld = await getNumHeld(capsulesAddress, capsulesAbi, fromAddress);

    let numGenesisBurned = 0;
    if (genesisBurned) {
        numGenesisBurned = genesisBurned.numBurns;
    }
    let numOg1Burned = 0;
    if (og1Burned) {
        numOg1Burned = og1Burned.numBurns;
    }
    let numOg2Burned = 0;
    if (og2Burned) {
        numOg2Burned = og2Burned.numBurns;
    }

    let allowedCapsules = numGenesisBurned + (numOg1Burned * 2) + (numOg2Burned * 2) - numCapsulesHeld;

    console.log(`${allowedCapsules} allowed, ${quantity} requested`)
/*    if (quantity > allowedCapsules) {
        res.status(500).json({
            message: `Could not mint: not enough burned tokens to generate ${quantity} capsules.  ${allowedCapsules} allowed`
        });
        return;
    }*/
    console.log(`Can mint ${quantity}`);

    // mint them
    hashes = [];
    for (let i = 0; i < quantity; i++) {

        const nftJson = await getRandomCapsuleColor();

        const tokenUri = await pinDataToPinata(nftJson);
        if (!tokenUri) {
            continue;
        }

        hashes.push(`ipfs://${tokenUri}`);

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.status(200).json({
        txHashes: hashes
    })
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
