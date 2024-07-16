import React, { useState, useEffect } from 'react';
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

// Ensure Buffer is available globally
window.Buffer = window.Buffer || Buffer;

// Pinata Configuration
const pinataApiKey = '742f5b64733fece091f0';
const pinataSecretApiKey = 'a332d7f801b0cf447c0130fe376e4677da017427a72e7891337ed2508af07135';

// Query Client
const queryClient = new QueryClient();

// Configure wagmi
const url = 'https://eth-sepolia.g.alchemy.com/v2/YoLeHZpDFkIOYCQXcceSXi8lwtn2H-vy';
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
  imageUrl: string;
}

// Contract addresses
const FACTORY_CONTRACT_ADDRESS = '0xeff886ddb64f2e04400220ed869b3613af3a6860';

const App = () => {
  const [factoryContract, setFactoryContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    const initializeContract = async () => {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(FACTORY_CONTRACT_ADDRESS, NFTFactory.abi, signer);
      setFactoryContract(contract);
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
        const transaction = await factoryContract.createCollection(name, symbol);
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
      const blob = base64ToBlob(values.imageUrl, 'image/png');
      const data = new FormData();
      data.append('file', blob, 'image.png');

      const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
        maxContentLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
      });

      const url = `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;

      console.log('Image uploaded to IPFS:', url);

      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      console.log('Provider and signer initialized');
      const contract = new ethers.Contract(address!, NFTMarketplace.abi, signer);

      console.log('Calling createNFT with URL:', url);

      const transaction = await contract.createNFT(url, {
        gasLimit: 500000,
      });

      await transaction.wait();
      console.log('Transaction successful:', transaction.hash);

      const newNftCollection = [...nftCollection, { ...values, imageUrl: url }];
      setNftCollection(newNftCollection);

      localStorage.setItem(`nftCollection-${address}`, JSON.stringify(newNftCollection));

      alert('Image uploaded and NFT created successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);

      if (error instanceof Error && 'code' in error) {
        const ethersError = error as any;

        if (ethersError.code === 'UNPREDICTABLE_GAS_LIMIT') {
          console.error('Transaction may fail or require manual gas limit.');
        } else if (ethersError.code === 'CALL_EXCEPTION') {
          console.error('Transaction failed:', ethersError.transactionHash);
        }
      }
      alert('Failed to upload image or create NFT.');
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
  const { address } = useParams();
  const [nftCollection, setNftCollection] = useState<UploadImageFormValues[]>([]);

  useEffect(() => {
    const savedCollection = localStorage.getItem(`nftCollection-${address}`);
    if (savedCollection) {
      setNftCollection(JSON.parse(savedCollection));
    }
  }, [address]);

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
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
