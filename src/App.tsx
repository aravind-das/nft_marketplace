import React, { useState, useEffect, useCallback } from 'react';
import { WagmiConfig, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import ConnectWallet from './components/Wallet';
import NFTForm from './components/NFTForm';
import { ethers } from 'ethers';
import NFTFactory from './NFTFactory.json';
import NFTMarketplace from './NFTMarketplace.json';
import axios from 'axios';
import { Buffer } from 'buffer';
import './App.css';

console.log(process.env);

// Ensure Buffer is available globally
window.Buffer = window.Buffer || Buffer;

// Pinata Configuration
const pinataApiKey = process.env.REACT_APP_PINATA_API_KEY;
const pinataSecretApiKey = process.env.REACT_APP_PINATA_SECRET_API_KEY;

// Query Client
const queryClient = new QueryClient();

// Configure wagmi
const url = process.env.REACT_APP_SEPOLIA_RPC_URL;
const wagmiClient = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(url),
  },
});

// Helper function to convert base64 to Blob
const base64ToBlob = (base64: string, type: string) => {
  try {
    const base64Data = base64.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid Base64 string');
    }
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  } catch (error) {
    console.error('Error converting Base64 string to Blob:', error);
    throw error;
  }
};


// Contract addresses
const FACTORY_CONTRACT_ADDRESS = process.env.REACT_APP_FACTORY_CONTRACT_ADDRESS || '';
const PAYMENT_HANDLER_ADDRESS = process.env.REACT_APP_PAYMENT_CONTRACT_ADDRESS || '';

const App = () => {
  const [factoryContract, setFactoryContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    const initializeContract = async () => {
      try {
        const provider = new ethers.providers.Web3Provider((window as any).ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(FACTORY_CONTRACT_ADDRESS, NFTFactory.abi, signer);
        setFactoryContract(contract);
      } catch (error) {
        console.error('Error initializing contract:', error);
      }
    };

    initializeContract();
  }, []);

  return (
    <WagmiConfig config={wagmiClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <nav>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/create-collection">Create Collection</Link>
              </li>
              <li>
                <Link to="/collections">View Collections</Link>
              </li>
            </ul>
          </nav>
          <ConnectWallet />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-collection" element={<CreateCollection factoryContract={factoryContract} />} />
            <Route path="/collections" element={<ViewCollections factoryContract={factoryContract} />} />
            <Route path="/collections/:address" element={<CollectionOptions />} />
            <Route path="/collections/:address/list-nft" element={<ListNFT />} />
            <Route path="/collections/:address/view-nfts" element={<ViewNFTs />} />
            <Route path="/collections/:address/proposals" element={<Proposals />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </WagmiConfig>
  );
};

const Home = () => (
  <div className="App">
    <h1>Welcome to the NFT Marketplace</h1>
    <p>
      Use the navigation above to create a new NFT collection or view existing collections.
    </p>
  </div>
);

const CreateCollection = ({ factoryContract }: { factoryContract: ethers.Contract | null }) => {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const navigate = useNavigate();

  const handleCreateCollection = async () => {
    if (factoryContract) {
      try {
        console.log(factoryContract);
        const transaction = await factoryContract.createCollection(name, symbol, PAYMENT_HANDLER_ADDRESS);
        const receipt = await transaction.wait();
        const collectionAddress = receipt.events[0].args.collection;
        console.log('Collection created with address:', collectionAddress);
        alert('Collection created successfully!');
        navigate('/collections');
      } catch (error) {
        console.error('Error creating collection:', error);
        alert('Failed to create collection.');
      }
    } else {
      console.error('Factory contract is not initialized');
      alert('Factory contract is not initialized');
    }
  };

  return (
    <div className="App">
      <h1>Create a New Collection</h1>
      <input
        type="text"
        placeholder="Collection Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Collection Symbol"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />
      <button onClick={handleCreateCollection}>Create Collection</button>
    </div>
  );
};

const ViewCollections = ({ factoryContract }: { factoryContract: ethers.Contract | null }) => {
  const [collections, setCollections] = useState<string[]>([]);

  useEffect(() => {
    const fetchCollections = async () => {
      if (factoryContract) {
        const collections = await factoryContract.getCollections();
        setCollections(collections);
      } else {
        console.error('Factory contract is not initialized');
      }
    };

    fetchCollections();
  }, [factoryContract]);

  return (
    <div className="App">
      <h1>Existing Collections</h1>
      <ul>
        {collections.map((address) => (
          <li key={address}>
            <Link to={`/collections/${address}`}>{address}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const CollectionOptions = () => {
  const { address } = useParams();

  return (
    <div className="App">
      <h1>Collection: {address}</h1>
      <nav>
        <ul>
          <li>
            <Link to={`/collections/${address}/list-nft`}>List NFT</Link>
          </li>
          <li>
            <Link to={`/collections/${address}/view-nfts`}>View NFTs</Link>
          </li>
          <li>
            <Link to={`/collections/${address}/proposals`}>Governance Proposals</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

const ListNFT = () => {
  const { address } = useParams();
  const [nftCollection, setNftCollection] = useState<any[]>([]);

  const handleSubmit = async (values: any) => {
    try {
      console.log('Start uploading image to Pinata');
      const blob = base64ToBlob(values.imageContent, 'image/png');
      const data = new FormData();
      data.append('file', blob, 'image.png');
  
      const imageRes = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
        maxContentLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
      });
  
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageRes.data.IpfsHash}`;
      console.log('Image uploaded to IPFS:', imageUrl);
  
      const metadata = {
        name: values.nftName,
        description: values.nftDescription,
        image: imageUrl,
      };
  
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metadataData = new FormData();
      metadataData.append('file', metadataBlob, 'metadata.json');
  
      const metadataRes = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', metadataData, {
        maxContentLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
      });
  
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataRes.data.IpfsHash}`;
      console.log('Metadata uploaded to IPFS:', metadataUrl);
  
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      console.log('Provider and signer initialized');
      const contract = new ethers.Contract(address!, NFTMarketplace.abi, signer);
  
      console.log('Calling createNFT with Metadata URL:', metadataUrl);
  
      let transaction;
      if (values.listingType === 'erc20') {
        transaction = await contract.createNFT(metadataUrl, values.paymentTokenAddress, ethers.utils.parseUnits(values.price.toString(), 18), {
          gasLimit: 600000,
        });
      } else if (values.listingType === 'erc1155') {
        transaction = await contract.listERC1155(values.erc1155TokenAddress, values.tokenId, values.amount, ethers.utils.parseUnits(values.price.toString(), 18), {
          gasLimit: 600000,
        });
      } else if (values.listingType === 'signature') {
        const messageHash = ethers.utils.solidityKeccak256(['string', 'address', 'uint256'], [metadataUrl, values.paymentTokenAddress, ethers.utils.parseUnits(values.price.toString(), 18)]);
        const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
        console.log('Seller Signature:', signature);
  
        transaction = await contract.listNFTSignature(metadataUrl, values.paymentTokenAddress, ethers.utils.parseUnits(values.price.toString(), 18), signature, {
          gasLimit: 600000,
        });
  
        const newNftItem: any = {
          ...values,
          status: 'available',
          tokenId: transaction.tokenId,
          owner: await signer.getAddress(),
          signature: signature, // Ensure to store the signature
        };
  
        setNftCollection([...nftCollection, newNftItem]);
      } else if (values.listingType === 'governance') {
        transaction = await contract.createProposal(metadataUrl, values.paymentTokenAddress, ethers.utils.parseUnits(values.price.toString(), 18), {
          gasLimit: 600000,
        });
        await transaction.wait();
        alert('Governance proposal created successfully!');
      }
  
      const receipt = await transaction.wait();
      console.log('Transaction successful:', transaction.hash);
  
      const tokenId = receipt.events && receipt.events[0] && receipt.events[0].args && receipt.events[0].args.tokenId
        ? receipt.events[0].args.tokenId.toNumber()
        : values.tokenId;
  
      const newNftItem: any = {
        ...values,
        status: 'available',
        tokenId: tokenId,
        owner: await signer.getAddress(),
      };
  
      setNftCollection([...nftCollection, newNftItem]);
  
      alert('Image and metadata uploaded, and NFT created successfully!');
    } catch (error: any) {
      console.error('Error uploading file:', error);
  
      let message = 'Failed to upload image or create NFT.';
      if (error?.error?.message) {
        message = error.error.message;
      } else if (error?.message) {
        message = error.message;
      }
      alert(message);
    }
  };
  


  return (
    <div className="App">
      <h1>List a new NFT</h1>
      <NFTForm onSubmit={handleSubmit} />
    </div>
  );
};


const ViewNFTs = () => {
  const { address } = useParams<{ address: string }>();
  const [erc20NftCollection, setErc20NftCollection] = useState<any[]>([]);
  const [erc1155NftCollection, setErc1155NftCollection] = useState<any[]>([]);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [signatureInput, setSignatureInput] = useState<string>('');

  const fetchNFTs = useCallback(async () => {
    if (!address || !marketplaceContract || !currentAccount) return;

    try {
      const [nftItems, erc1155Items] = await marketplaceContract.fetchAllNFTs();
      const items = await Promise.all(nftItems.map(async (nft: any) => {
        const tokenId = nft[0].toNumber(); // Convert BigNumber to number
        const owner = nft[1];
        const tokenURI = nft[2];
        const paymentToken = nft[3];
        const price = ethers.utils.formatUnits(nft[4].toString(), 'ether'); // Convert BigNumber to string and format as ether
        const signature = nft[5]; // Add signature to fetched data
        
        const meta = await fetch(tokenURI).then((response) => response.json());
        const status = owner.toLowerCase() === currentAccount?.toLowerCase() ? 'sold' : 'available';

        return {
          tokenId: tokenId,
          owner: owner,
          tokenURI: tokenURI,
          paymentTokenAddress: paymentToken,
          price: price,
          imageUrl: meta.image, // Use image URL from metadata
          nftName: meta.name,
          nftDescription: meta.description,
          status: status,
          listingType: 'erc20',
          signature: signature, // Include the signature in the returned data
        };
      }));

      const erc1155ItemsProcessed = erc1155Items.map((item: any) => ({
        tokenId: item.tokenId.toNumber(),
        owner: item.owner,
        tokenAddress: item.tokenAddress,
        amount: item.amount.toNumber(),
        price: ethers.utils.formatUnits(item.price.toString(), 'ether'),
        listingType: 'erc1155',
        imageUrl: '', // Add your image URL here if you have any, otherwise handle this in the render function
        nftName: 'ERC1155 Token',
        nftDescription: `Amount: ${item.amount}`,
        status: item.owner.toLowerCase() === currentAccount?.toLowerCase() ? 'sold' : 'available',
      }));

      setErc20NftCollection(items);
      setErc1155NftCollection(erc1155ItemsProcessed);
      console.log('NFTs fetched:', items, erc1155ItemsProcessed);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    }
  }, [address, marketplaceContract, currentAccount]);

  useEffect(() => {
    const initializeContract = async () => {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(address!, NFTMarketplace.abi, signer);
      setMarketplaceContract(contract);

      // Get current account
      const accounts = await provider.send("eth_requestAccounts", []);
      setCurrentAccount(accounts[0]);
    };

    if (address) {
      initializeContract();
    }
  }, [address]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  const handlePurchase = async (tokenId: number, listingType: string) => {
    if (marketplaceContract) {
      try {
        const provider = new ethers.providers.Web3Provider((window as any).ethereum);
        const signer = provider.getSigner();
        const account = await signer.getAddress();

        const nft = listingType === 'erc20'
          ? erc20NftCollection.find(nft => nft.tokenId === tokenId)
          : erc1155NftCollection.find(nft => nft.tokenId === tokenId);
        if (!nft) {
          console.error('NFT not found');
          return;
        }

        console.log('NFT:', nft);
        console.log('Listing Type:', listingType);

        if (listingType === 'erc20') {
          const paymentHandlerAddress = await marketplaceContract.paymentHandler();

          const paymentToken = new ethers.Contract(nft.paymentTokenAddress, [
            "function balanceOf(address owner) view returns (uint256)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function approve(address spender, uint256 value) public returns (bool)"
          ], signer);

          const tokenBalance = await paymentToken.balanceOf(account);
          const allowance = await paymentToken.allowance(account, paymentHandlerAddress);

          console.log('ERC20 Token Balance:', tokenBalance.toString());
          console.log('Allowance:', allowance.toString());

          const priceInWei = ethers.utils.parseUnits(nft.price.toString(), 18);

          if (tokenBalance.lt(priceInWei)) {
            alert('Insufficient token balance to purchase NFT.');
            return;
          }

          if (allowance.lt(priceInWei)) {
            const approveTx = await paymentToken.approve(paymentHandlerAddress, priceInWei);
            await approveTx.wait();
            console.log('Tokens approved successfully.');
          }

          console.log('Purchasing ERC20 NFT with price:', priceInWei.toString());

          const transaction = await marketplaceContract.purchaseNFT(tokenId, { gasLimit: 500000 });
          await transaction.wait();
        } else if (listingType === 'erc1155') {
          console.log('ERC1155 Purchase:', nft);

          const priceInWei = ethers.utils.parseUnits(nft.price.toString(), 'ether');
          const amount = nft.amount;

          console.log('Price in Wei:', priceInWei.toString());
          console.log('Amount:', amount);

          // Ensure all required values are defined
          if (!priceInWei || !amount || !tokenId) {
            console.error('Missing required values for ERC1155 purchase');
            return;
          }

          const transaction = await marketplaceContract.purchaseERC1155(tokenId, amount, { value: priceInWei.mul(amount), gasLimit: 500000 });
          await transaction.wait();
        }

        alert('NFT purchased successfully!');
        fetchNFTs();
      } catch (error: any) {
        console.error('Error purchasing NFT:', error);

        let message = 'Failed to purchase NFT.';
        if (error?.data?.message) {
          message = error.data.message;
        } else if (error?.message) {
          message = error.message;
        }
        alert(message);
      }
    } else {
      console.error('Marketplace contract is not initialized');
    }
  };

  const handlePurchaseWithSignature = async (tokenId: number, sellerSignature: string) => {
    if (marketplaceContract) {
      try {
        const provider = new ethers.providers.Web3Provider((window as any).ethereum);
        const signer = provider.getSigner();
        const account = await signer.getAddress();
        
        const nft = erc20NftCollection.find(nft => nft.tokenId === tokenId);
        if (!nft) {
          console.error('NFT not found');
          return;
        }

        const priceInWei = ethers.utils.parseUnits(nft.price.toString(), 18);

        const messageHash = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'address'], [tokenId, priceInWei, account]);

        // Compare the provided buyer signature with the stored seller signature
        if (sellerSignature !== nft.signature) {
          alert('Signature mismatch. Please provide the correct signature.');
          return;
        }

        const paymentHandlerAddress = await marketplaceContract.paymentHandler();
        const paymentToken = new ethers.Contract(nft.paymentTokenAddress, [
          "function balanceOf(address owner) view returns (uint256)",
          "function allowance(address owner, address spender) view returns (uint256)",
          "function approve(address spender, uint256 value) public returns (bool)"
        ], signer);

        const tokenBalance = await paymentToken.balanceOf(account);
        const allowance = await paymentToken.allowance(account, paymentHandlerAddress);

        console.log('ERC20 Token Balance:', tokenBalance.toString());
        console.log('Allowance:', allowance.toString());

        if (tokenBalance.lt(priceInWei)) {
          alert('Insufficient token balance to purchase NFT.');
          return;
        }

        if (allowance.lt(priceInWei)) {
          const approveTx = await paymentToken.approve(paymentHandlerAddress, priceInWei);
          await approveTx.wait();
          console.log('Tokens approved successfully.');
        }

        const transaction = await marketplaceContract.purchaseNFTWithSignature(tokenId, priceInWei, account, sellerSignature, {
          gasLimit: 500000,
        });

        await transaction.wait();
        alert('NFT purchased successfully with signature!');
        fetchNFTs();
      } catch (error: any) {
        console.error('Error purchasing NFT with signature:', error);

        let message = 'Failed to purchase NFT.';
        if (error?.error?.message) {
          message = error.error.message;
        } else if (error?.message) {
          message = error.message;
        }
        alert(message);
      }
    } else {
      console.error('Marketplace contract is not initialized');
    }
  };

  return (
    <div className="App">
      <h1>NFT Collection: {address}</h1>
      <div className="nft-collection">
        {erc20NftCollection.map((nft, index) => (
          <div key={index} className="nft-item">
            <img src={nft.imageUrl} alt={nft.nftName} />
            <div>{nft.nftName}</div>
            <div>{nft.nftDescription}</div>
            <div>{nft.price} Tokens</div>
            {nft.status === 'sold' ? (
              <div>Status: Sold</div>
            ) : (
              <>
                <button onClick={() => handlePurchase(nft.tokenId, nft.listingType)}>Buy NFT</button>
                <div>
                  <input
                    type="text"
                    placeholder="Enter Seller's Signature"
                    value={signatureInput}
                    onChange={(e) => setSignatureInput(e.target.value)}
                  />
                  <button onClick={() => handlePurchaseWithSignature(nft.tokenId, signatureInput)}>
                    Buy NFT with Signature
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {erc1155NftCollection.map((nft, index) => (
          <div key={index} className="nft-item">
            <div>{nft.nftName}</div>
            <div>{nft.nftDescription}</div>
            <div>{nft.amount} available</div>
            <div>{nft.price} ETH (Total: {(nft.amount * nft.price).toFixed(4)} ETH)</div>
            {nft.status === 'sold' ? (
              <div>Status: Sold</div>
            ) : (
              <button onClick={() => handlePurchase(nft.tokenId, nft.listingType)}>Buy NFT</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Proposals = () => {
  const { address } = useParams<{ address: string }>();
  const [proposals, setProposals] = useState<any[]>([]);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      if (!address || !marketplaceContract || !currentAccount) return;

      try {
        const proposalCount = await marketplaceContract.proposalCounter();
        const fetchedProposals = [];
        for (let i = 0; i < proposalCount; i++) {
          const proposal = await marketplaceContract.proposals(i);
          fetchedProposals.push({
            id: proposal.id.toNumber(),
            tokenURI: proposal.tokenURI,
            paymentToken: proposal.paymentToken,
            price: ethers.utils.formatUnits(proposal.price.toString(), 'ether'),
            votes: proposal.votes.toNumber(),
            executed: proposal.executed,
          });
        }
        setProposals(fetchedProposals);
      } catch (error) {
        console.error('Error fetching proposals:', error);
      }
    };

    if (marketplaceContract) {
      fetchProposals();
    }
  }, [address, marketplaceContract, currentAccount]);

  useEffect(() => {
    const initializeContract = async () => {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(address!, NFTMarketplace.abi, signer);
      setMarketplaceContract(contract);

      // Get current account
      const accounts = await provider.send("eth_requestAccounts", []);
      setCurrentAccount(accounts[0]);
    };

    if (address) {
      initializeContract();
    }
  }, [address]);

  const handleVote = async (proposalId: number) => {
    if (marketplaceContract) {
      try {
        const transaction = await marketplaceContract.voteOnProposal(proposalId);
        await transaction.wait();
        alert('Voted successfully!');
      } catch (error: any) {
        console.error('Error voting on proposal:', error);
        alert('Failed to vote on proposal.');
      }
    } else {
      console.error('Marketplace contract is not initialized');
    }
  };

  const handleExecute = async (proposalId: number) => {
    if (marketplaceContract) {
      try {
        const transaction = await marketplaceContract.executeProposal(proposalId);
        await transaction.wait();
        alert('Proposal executed successfully!');
      } catch (error: any) {
        console.error('Error executing proposal:', error);
        alert('Failed to execute proposal.');
      }
    } else {
      console.error('Marketplace contract is not initialized');
    }
  };

  return (
    <div className="App">
      <h1>Governance Proposals</h1>
      <div className="proposal-list">
        {proposals.map((proposal, index) => (
          <div key={index} className="proposal-item">
            <div>Proposal ID: {proposal.id}</div>
            <div>Token URI: {proposal.tokenURI}</div>
            <div>Payment Token: {proposal.paymentToken}</div>
            <div>Price: {proposal.price} ETH</div>
            <div>Votes: {proposal.votes}</div>
            <div>Status: {proposal.executed ? 'Executed' : 'Pending'}</div>
            <button onClick={() => handleVote(proposal.id)} disabled={proposal.executed}>Vote</button>
            <button onClick={() => handleExecute(proposal.id)} disabled={proposal.executed}>Execute</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
