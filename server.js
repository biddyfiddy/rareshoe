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

const whitelist = [
    "0x397bBD1637882fe3da8E7bCc6A9cdB7d02Ac4d43",
    "0xe7124b174243d3A128139924d320def286b6f91B",
    "0x32589Af560a97639B1a575760F74447611BFE671",
    "0x1fDdCbA47B5FC9242EC2241D7B05E4d0cB1a8bB5",
    "0xb6dC958B365DBFdfF3bb9306aFaaE4EE47D12342",
    "0x71793e2Ef952A829f3298AAfC54A37aa4ea6AC1F",
    "0x8D662312a12dEdBfD9f558eD9821d87922650b2c",
    "0x59795F019579005Ad4b8A0894D9CF7CfAf8d7053",
    "0xeD662E5d91d85660F3F6C65582CDeb9a1263CbB7",
    "0xaC48Ac276d9A75E8E56455739Ffb4f851BbB4F8d",
    "0xbF8eB3A56387E767fC38858dE56171Df275363a2",
    "0xC59523e69Dc4EF360702fE9cAB9ac7376B5a4cB2",
    "0xCE944473EC43235F7339d2521D2bDE2FE1A70c0D",
    "0x4718D398dd4b0EC472700bD1f6091ed82c49c256",
    "0x12D3e48D37aB5B40EB246D3124e2b05A5a155a9E",
    "0x7Bab8bdde399A2cdf55E34c54B5a880cF11f99eE",
    "0x5115355E6D04Aec8546232f0f8c3f91FEAC2c22A",
    "0x64Bf7a7b25A5b15c1572aaF464204A8a528123f4",
    "0x6D9944065B577831897224991467119cBD1887Ea",
    "0x1218eaE23A52af1e29E74695c64f174204A3b705",
    "0xF1199b160fA5c2C9F5e38C9C92d8cC3046c7f9aA",
    "0x9d0b0c6Bc8B6Ad4E0a33a5BB523A9f19A8B568e2",
    "0x6551C8Dd85570ECd09fB7559022Bd17795CAae24",
    "0x653e9F58E02D559f58260338a72878A67fd65637",
    "0xb03b1a7c9c3213a33f2eb2af63206de1222fbb66",
    "0xec73d3cb775cec221fff545807936206320b7483",
    "0x7f1c6d0017915f2dc140c96ffef2eee1d9dcead4",
    "0xF98E849C4b0de9750630f1C23C1beA9E79b4eDB3",
    "0x61ad944C6520116Fff7d537a789d28391A7A6425",
    "0x9703d9cf2f834e71d9b70675e746f7b634c9d1e9",
    "0xbB32d9843F15D2A5E19Ccd6b2AE2AA20bfeefcaa",
    "0xe5e508c953114f8688b9d6072cb1196cf6487006",
    "0x0e9de377b413fdec81f677c9138c65887c19564d",
    "0x6D9944065B577831897224991467119cBD1887Ea",
    "0xe6ddf6e3962592590883d22fe4a8b2156b23e3aa",
    "0x21ac94c06b7a58b4569fc508826ecb8eff92e2ec",
    "0x21AC94c06b7A58b4569fc508826ECB8eff92E2eC",
    "0x249a7EeB122dD2e457e957B2cFC8575965b4063F",
    "0x39a523208c6967EDFe0baE3a2c668F0310d3Ef43",
    "0xfba16ad148dd009bc3a0cc720c628032838e8f1b",
    "0xc6F681304341C16B7d4d450c3f96Cd1aF2eA6a3C",
    "0xdefb4c3bfea0fd4d99854434a5640baf26e46ba5",
    "0xe22587927937515F7FF6A6cEcC94C1b2d30aC1B7",
    "0x50025A3A50dA7Ae49630c5806b4411B0B7B55821",
    "0x344066cd5fdd81cbcc402e900d62b4c4211beb48",
    "0xd7a481069fe91e8b8c2a44e62e128f4edb32681e",
    "0xBb78bb6e33daF69179aDb6DD14eA8fCE0d2775d1",
    "0x4F0c96f558Ed4E6327E555EbF7E2113aC8D00Dc5",
    "0x9E5C2E289fBE687DdF5294444102c0F55C9AE4d8",
    "0x9c51532ef51ab720514b5acaf97fe6c600fbfb54",
    "0x3AC79458eB086dEB8B0b1f35b444104464b9b265",
    "0x0ca974e2937d0f06b3631e0a5504406cc62f4ebf",
    "0x891A2B655030452888157b4798C3837eB594268A",
    "0x71c3AA6abAA1Df47818D19117fefeeaCc7493B7e",
    "0xfe6f1d685f192afa042adff85c13727ddda42a83",
    "0xE666542427aDA735F6Ce9D946358F1FbB558b247",
    "0xFAa2B3FfB74d9fEA3caE899CD02485646a69bD24",
    "0x3A00B3c58E45F2d5Ce8E6929F6d12d792b0C3323",
    "0x7626B48CDDf9d8C5555a6994B09D3C4cA80eae6B",
    "0xFa2422AcED8E04d30F29e4d19b0DA4060fFAecA3",
    "0x6D9944065B577831897224991467119cBD1887Ea",
    "0xe60f32412d728ab1e86181feb76cda24d2e52295",
    "0x352009db62de4d6a943f3e180f33f4b9b5367027",
    "0x7e5baaa750e052187b9972b9f3ba8ef908b8dead",
    "0x063879972a6e724da46c85cd6e8b4aa229e233a7",
    "0x039ec0b36450e9b2c5f59a3a6fe991469ac744f2",
    "0xd5844c4157a8c4f3c113328c5e24d510b4b31be6",
    "0xf239f615041b9a26f40ed37a8618c190d327eb8b",
    "0xea1126e70185400a2cf0de2a6b35428fb8affd29",
    "0x0b9c75e3786fbe0c7c795c4fee19111693b529c8",
    "0x72a34c09abb92ff5616522061afee2986d844b4b",
    "0xae4e84139804cc18ee4c4daabe5fe264a4600a27",
    "0xdff3789d4c45eb099f3d9ea4e0f1ce59f8e58cc2",
    "0x9c5123aea0c14a6bd465a2de8859615c9ee43883",
    "0x7622a0ac690056e3ba5d2b07a64691de7ed0a59e",
    "0x910ed86248a4afc2814e115ae415ac94198168d7",
    "0xa2a0a02b75bad38a4ed423ff56eb5787e52dfe62",
    "0x7a1b7f694772672ba4154e9d05e39e489de48344",
    "0xa41b6f18d696d32afe88e44e4f14747fb2b92902",
    "0x0795536288350475bb77b5d4e5cb862b4fd1792b",
    "0xf05dc38847cf2b8b1c971b566255f4b1cdb3e531",
    "0xe1dd33f06f53c8a4c04ce5de52d43122e790544a",
    "0xba7cdd14bc077f1a717b01235f2a2f451b57d480",
    "0x73d4d8a079152c01426edfb32397b605108998d7",
    "0xa5ab1d69b3519c02ac5bbb4f5958892568695ea2",
    "0x024fe277b55b07937a444e30c13e42fa66812564",
    "0xb4bffcfedc5e129fc960df7399e7fa23810156d1",
    "0x61cfecc056a1fd9cc0c4e76d768403adbcf48035",
    "0x3736dd8b37a4c1dc2e870fd4fa681c2d37451e0d",
    "0x57da3ab4030b966bc4c0549677abee4a33ffca7d",
    "0x0d5958b734d528ee979853dad79728ef18900ed1",
    "0x1801424D1d95E84213234A63cA8B022f21430dC1",
    "0x5f69f1751a1915a515deba096a249c385abe2e99",
    "0x1eee56cd6d63ae4c12ff6032969233910e04bf7c",
    "0x9b7051c72d4377ec26c2a44a973234b822090b5b",
    "0xcd5a763f740d1ad6bc978a78b9c295368304baa5",
    "0x5b4b6043e1bc0769b4218e4f40d92157df7fd1ee",
    "0x58b1e33d637d5b3adfaeb0ffe9c452364bde4bf0",
    "0xa26034e6b0bd5e8bd3649ae98960309dbd9eda7f",
    "0xd472d2171cc42846ece5fca08239265ff0b8def2",
    "0x26439aeb008d63b6686798b5f08a84c7abefbd80",
    "0x249a7EeB122dD2e457e957B2cFC8575965b4063F",
    "0x628eA111406A68f4EC00cA3587843Ef0058BA6f3",
    "0xfb83388Cb78A07Bd7e163E70Aecd1d1e2a19D81E",
    "0x32417DC69162e493CAE4648E6919e468b28a2F56",
    "0x716A22ebEBf87e2db3B383c932b8D1430c3Bdb14",
    "0x6CA42042c1FB0eE5F6dea1cDa5375b10A2700e9D",
    "0xc3b6aAb7409213675c0c8C3482B1DD359bCE4321",
    "0xa8c6990BC778611Ffd5B94Db6BeFefC7aE74b147",
    "0x744143D55Fa960F0364C23E6cb0c4D673C4E2017",
    "0xaD40890377e41893a4b0151226f9ca020a5D32ab",
    "0xbC392Ee99baEE132421344767Af119DC02547FE4",
    "0x4FbB5D6a84a99A4dA601cc8b65C35f52B7F4fcba",
    "0xf7321Cb3Ab5EaD1C78187380D89c3c6Afb492C84",
    "0xb9C84c03391b5C0545B921afd755010b60b1C84D",
    "0xfded90a3b1348425577688866f798f94d77a0d02",
    "0x113eD70472881AB99e4CE8d5b3D2571dEB96618a",
    "0xff5e190e1362605a39dd7a235ba69f5f14fe1430"
]

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

    if (!whitelist.includes(message.fromAddress)) {
        return res.status(500).json("Address is not in whitelist")
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

        hashes.push(`ipfs://${tokenUri}`);

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.status(200).json({
        txHashes: hashes
    })
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
