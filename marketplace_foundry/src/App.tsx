// src/App.tsx

import React, { useState, useEffect } from 'react';
import { WagmiConfig, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ConnectWallet from './components/Wallet';
import ImageForm from './components/UploadImageForm';
import { ethers } from 'ethers';
import NFTMarketplace from './NFTMarketplace_copy.sol/NFTMarketplace.json';
import axios from 'axios';
import { Buffer } from 'buffer';
import Collections from './components/Collections';
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

const CONTRACT_ADDRESS = '0x37ee1c8a3e07269fcfadd0c1ac19a6c04967d4f8';

const App = () => {
  const [nftCollection, setNftCollection] = useState<UploadImageFormValues[]>([]);

  useEffect(() => {
    // Load NFT collection from local storage
    const savedCollection = localStorage.getItem('nftCollection');
    if (savedCollection) {
      setNftCollection(JSON.parse(savedCollection));
    }
  }, []);

  const handleSubmit = async (values: UploadImageFormValues) => {
    try {
      // Convert base64 image to Blob
      const blob = base64ToBlob(values.imageUrl, 'image/png');

      // Create FormData and append the file
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

      console.log('Image uploaded to IPFS:', url); // Log the IPFS URL

      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, signer);
      const transaction = await contract.createNFT(url);
      await transaction.wait();

      const newNftCollection = [...nftCollection, { ...values, imageUrl: url }];
      setNftCollection(newNftCollection);

      // Save NFT collection to local storage
      localStorage.setItem('nftCollection', JSON.stringify(newNftCollection));

      // Show success alert
      alert('Image uploaded and NFT created successfully!');
    } catch (error) {
      console.error('Error uploading file: ', error);
      // Show failure alert
      alert('Failed to upload image or create NFT.');
    }
  };

  return (
    <WagmiConfig config={wagmiClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <nav>
            <ul>
              <li>
                <Link to="/">List NFT</Link>
              </li>
              <li>
                <Link to="/collections">Collections</Link>
              </li>
            </ul>
          </nav>
          <Routes>
            <Route
              path="/"
              element={
                <div className="App">
                  <h1>List NFT</h1>
                  <ConnectWallet />
                  <ImageForm onSubmit={handleSubmit} />
                </div>
              }
            />
            <Route path="/collections" element={<Collections nftCollection={nftCollection} />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </WagmiConfig>
  );
};

export default App;
