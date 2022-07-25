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
    let og1Burned = await getNumBurned(toAddress, fromAddress, og1Address.toLowerCase());
    let og2Burned = await getNumBurned(toAddress, fromAddress, og2Address.toLowerCase());
    let numCapsulesHeld = await getNumHeld(capsulesAddress, capsulesAbi, fromAddress);
    return new Promise((resolve, reject) => {
        resolve({
            allowedCapsules: (genesisBurned.numBurns + (og1Burned.numBurns * 2) + (og2Burned.numBurns * 2) - numCapsulesHeld),
            capsulesHeld: parseInt(numCapsulesHeld),
            amountGenesisBurned: genesisBurned.numBurns,
            amountOg1Burned: og1Burned.numBurns,
            amountOg2Burned: og2Burned.numBurns
        });
    }).catch(err => {
        console.log(err);
    });
}

const getNumCapsulesAndTypes = async (address) => {
    let provider = new ethers.providers.EtherscanProvider(ETHER_NETWORK, API_KEY);
    const contract = new ethers.Contract(capsulesAddress, capsulesAbi, provider);

    let total = await contract.totalSupply().catch(err => {
        return;
    });

    let red = 0;
    let yellow = 0;
    let blue = 0;

    for (let i = 0; i < total; i++) {
        let owner = await contract.ownerOf(i).catch(err => {
            // no op
        });
        if (owner.toString().toLowerCase() === address) {
            let uri = await contract.tokenURI(i)
            uri = uri.replace("ipfs://", "https://slimeball.mypinata.cloud/ipfs/");

            await axios.get(uri, {
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
        }
    }

    return new Promise((resolve, reject) => {
        resolve({
            "red": red,
            "yellow": yellow,
            "blue": blue,
            "total": red + yellow + blue
        });
    });
};

const getNumBurned = async (toAddress, fromAddress, contractAddress) => {
    console.log(`Getting amount of ${contractAddress} burned for ${toAddress}`);
    let network = ETHER_NETWORK === 'mainnet' ? '' : `-${ETHER_NETWORK}`;

    return axios.get(`https://api${network}.etherscan.io/api?module=account&action=tokennfttx&address=${toAddress}&startblock=0&endblock=999999999&sort=asc&apikey=${API_KEY}`).then(response => {
        let responseData = response.data;
        let burns = responseData.result;
        let numBurns = 0;
        burns.forEach(burn => {
            console.log(`${burn.contractAddress} === ${og1Address}`)
            console.log(`${burn.contractAddress} === ${og2Address}`)
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

        console.log(tokens)

        // if token.to === address add to list
        // if token.from === address remove from list
        let tokenId = [];
        tokens.forEach(token => {
            if (token.to === address) {
                tokenId.push(token.tokenID);
            }
        })

        tokens.forEach(token => {
            if (token.to === address) {
                tokenId.push(token.tokenID);
                tokenId.splice(tokenId.indexOf(token.tokenID), 1);
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

        console.log(tokens)

        // if token.to === address add to list
        // if token.from === address remove from list
        let tokenId = [];
        tokens.forEach(token => {
            if (token.to === address) {
                tokenId.push(token.tokenID);
            }
        })

        tokens.forEach(token => {
            if (token.to === address) {
                tokenId.push(token.tokenID);
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

const mintToken = async (toAddress, tokenUri) => {
    let provider = new ethers.providers.EtherscanProvider(ETHER_NETWORK, API_KEY);
    const wallet = new ethers.Wallet(WALLET_KEY, provider);

    const nonce = await wallet.getTransactionCount()
    if (!nonce) {
        return [];
    }
    const gasFeePromise = await provider.getFeeData();
    if (!gasFeePromise) {
        return [];
    }
    const gasFee = gasFeePromise.gasPrice;
    if (!gasFee) {
        return [];
    }
    const contractInstance = new ethers.Contract(capsulesAddress, capsulesAbi, provider)

    let rawTxn = await contractInstance.populateTransaction.burnMint(toAddress, tokenUri, {
        gasPrice: gasFee,
        nonce: nonce
    })

    console.log("Submitting transaction with gas price of:", ethers.utils.formatUnits(gasFee, "gwei") + " wei");
    let signedTxn = await wallet.sendTransaction(rawTxn).catch(err => {
        console.log(err);
    });
    return signedTxn.wait().then(reciept => {
        if (reciept) {
            return signedTxn.hash;
        } else {
            console.log("Error submitting transaction")
        }
    }).catch(err => {
        console.log(err);
    });
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

    const uriFixed = uri.replace("ipfs://", "https://slimeball.mypinata.cloud/ipfs/");
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
        res.status(200).json({allowed: 0});
    }
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
    if (!genesisBurned) {
        res.status(500).json({ message: "Could not get number of Genesis tokens burned"});
    }
    let og1Burned = await getNumBurned(toAddress, fromAddress, og1Address.toLowerCase());
    if (!og1Burned) {
        res.status(500).json({ message: "Could not get number of OG tokens burned"});
    }
    let og2Burned = await getNumBurned(toAddress, fromAddress, og2Address.toLowerCase());
    if (!og2Burned) {
        res.status(500).json({ message: "Could not get number of Genesis tokens burned"});
    }
    let numCapsulesHeld = await getNumHeld(capsulesAddress, capsulesAbi, fromAddress);
    if (!numCapsulesHeld) {
        res.status(500).json({ message: "Could not get number of Capsules held"});
    }

    let allowedCapsules = genesisBurned.numBurns + (og1Burned.numBurns * 2) + (og2Burned.numBurns * 2) - numCapsulesHeld;

    console.log(`${allowedCapsules} allowed, ${quantity} requested`)
    if (quantity > allowedCapsules) {
        res.status(500).json({
            message: `Could not mint: not enough burned tokens to generate ${quantity} capsules.  ${allowedCapsules} allowed`
        });
        return;
    }
    console.log(`Can mint ${quantity}`);

    // mint them
    hashes = [];
    for (let i = 0; i < quantity; i++) {

        const nftJson = await getRandomCapsuleColor();

        const tokenUri = await pinDataToPinata(nftJson);
        if (!tokenUri) {
            continue;
        }

        const tokenResult = await mintToken(fromAddress, `ipfs://${tokenUri}`);
        if (!tokenResult) {
            continue;
        }

        let network = ETHER_NETWORK === 'mainnet' ? '' : ETHER_NETWORK;
        let url = `https://${network}.etherscan.io/tx/${tokenResult}`

        hashes.push(url);

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.status(200).json({
        txHashes: hashes
    })
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
