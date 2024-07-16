// src/components/Collections.tsx

import React from 'react';

interface UploadImageFormValues {
  nftName: string;
  nftDescription: string;
  price: number;
  imageUrl: string;
}

const Collections = ({ nftCollection }: { nftCollection: UploadImageFormValues[] }) => {
  return (
    <div className="nft-collection">
      <h1>Collections</h1>
      {nftCollection.map((nft, index) => (
        <div key={index} className="nft-item">
          <img src={nft.imageUrl} alt={nft.nftName} />
          <div>{nft.nftName}</div>
          <div>{nft.nftDescription}</div>
          <div>{nft.price} ETH</div>
        </div>
      ))}
    </div>
  );
};

export default Collections;