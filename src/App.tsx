import React, { useState, useEffect, useCallback } from 'react';
import { WagmiConfig, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import ConnectWallet from './components/Wallet';
import ImageForm from './components/UploadImageForm';
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
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
};

// Upload Image Form Values Interface
interface UploadImageFormValues {
  nftName: string;
  nftDescription: string;
  price: number;
  paymentTokenAddress: string;
  imageContent: string;
}

// Contract addresses
// const FACTORY_CONTRACT_ADDRESS = '0xeff886ddb64f2e04400220ed869b3613af3a6860';
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
        // const transaction = await factoryContract.createCollection(name, symbol, {
        //   gasLimit: 500000
        // });
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
        </ul>
      </nav>
    </div>
  );
};

const ListNFT = () => {
  const { address } = useParams();
  const [nftCollection, setNftCollection] = useState<UploadImageFormValues[]>([]);

  useEffect(() => {
    const savedCollection = localStorage.getItem(`nftCollection-${address}`);
    if (savedCollection) {
      setNftCollection(JSON.parse(savedCollection));
    }
  }, [address]);

  const handleSubmit = async (values: UploadImageFormValues) => {
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

      // Create metadata JSON
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

      const transaction = await contract.createNFT(metadataUrl, values.paymentTokenAddress, ethers.utils.parseUnits(values.price.toString(), 18), {
        gasLimit: 500000,
      });

      const receipt = await transaction.wait();
      console.log('Transaction successful:', transaction.hash);

      // Extract tokenId from the transaction receipt
      const tokenId = receipt.events[0].args.tokenId.toNumber();

      const newNftItem: any = {
        ...values,
        status: 'available',
        tokenId: tokenId,
        owner: await signer.getAddress(),
      };

      const newNftCollection = [...nftCollection, newNftItem];
      setNftCollection(newNftCollection);

      localStorage.setItem(`nftCollection-${address}`, JSON.stringify(newNftCollection));

      alert('Image and metadata uploaded, and NFT created successfully!');
    } catch (error: any) {
      console.error('Error uploading file:', error);

      // Extract the revert reason from the error
      let message = 'Failed to purchase NFT.';
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
      <ImageForm onSubmit={handleSubmit} />
    </div>
  );
};

const ViewNFTs = () => {
  const { address } = useParams<{ address: string }>();
  const [nftCollection, setNftCollection] = useState<any[]>([]);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);

  const fetchNFTs = useCallback(async () => {
    if (!address || !marketplaceContract || !currentAccount) return;

    try {
      const nftItems = await marketplaceContract.fetchAllNFTs();
      const items = await Promise.all(nftItems.map(async (nft: any) => {
        const tokenId = nft[0].toNumber(); // Convert BigNumber to number
        const owner = nft[1];
        const tokenURI = nft[2];
        const paymentToken = nft[3];
        const price = ethers.utils.formatUnits(nft[4].toString(), 'ether'); // Convert BigNumber to string and format as ether

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
        };
      }));
      setNftCollection(items);
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

  const handlePurchase = async (tokenId: number) => {
    if (marketplaceContract) {
      try {
        const provider = new ethers.providers.Web3Provider((window as any).ethereum);
        const signer = provider.getSigner();
        const account = await signer.getAddress();

        // Get the payment handler address
        const paymentHandlerAddress = await marketplaceContract.paymentHandler();
        const nft = nftCollection.find(nft => nft.tokenId === tokenId);
        if (!nft) {
          console.error('NFT not found');
          return;
        }

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

        const transaction = await marketplaceContract.purchaseNFT(tokenId, {
          gasLimit: 500000,
        });

        await transaction.wait();
        alert('NFT purchased successfully!');
        fetchNFTs();
      } catch (error: any) {
        console.error('Error purchasing NFT:', error);

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
        {nftCollection.map((nft, index) => (
          <div key={index} className="nft-item">
            <img src={nft.imageUrl} alt={nft.nftName} />
            <div>{nft.nftName}</div>
            <div>{nft.nftDescription}</div>
            <div>{nft.price} ETH</div>
            {nft.status === 'sold' ? (
              <div>Status: Sold</div>
            ) : (
              <button onClick={() => handlePurchase(nft.tokenId)}>Buy NFT</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

};

export default App;
