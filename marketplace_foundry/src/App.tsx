// src/App.tsx

import React, { useState } from 'react';
import { WagmiConfig, createConfig, useAccount } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConnectWallet from './components/Wallet';
import ImageForm from './components/UploadImageForm';
import { ethers } from 'ethers';
import NFTMarketplace from './NFTMarketplace_copy.sol/NFTMarketplace.json';
import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

// Ensure Buffer is available globally
window.Buffer = window.Buffer || Buffer;

// IPFS Configuration using Alchemy
const projectId = 'https://eth-sepolia.g.alchemy.com/v2/YoLeHZpDFkIOYCQXcceSXi8lwtn2H-vy';
const projectSecret = '98062f0955237f77928cfe0bcf98ab1c98930b411d1270cbea8aa323549c6fb6';
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const client = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

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
  const { address } = useAccount();

  const handleSubmit = async (values: UploadImageFormValues) => {
    try {
      const added = await client.add(values.imageUrl);
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;

      console.log('Image uploaded to IPFS:', url); // Log the IPFS URL

      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, signer);
      const transaction = await contract.createNFT(url);
      await transaction.wait();

      setNftCollection((prevCollection) => [...prevCollection, { ...values, imageUrl: url }]);

      // Create a text file with the IPFS URL and trigger download
      const blob = new Blob([url], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ipfs_url.txt';
      link.click();

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
        <div className="App">
          <h1>NFT Marketplace</h1>
          <ConnectWallet />
          <ImageForm onSubmit={handleSubmit} />
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
      </QueryClientProvider>
    </WagmiConfig>
  );
};

export default App;
