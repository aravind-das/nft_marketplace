import React, { useState } from 'react';
import { useFormik } from 'formik';
import './NFTForm.css';

interface NFTFormProps {
  onSubmit: (values: any) => void;
}

export default function NFTForm(props: NFTFormProps) {
  const [listingType, setListingType] = useState<'erc20' | 'erc1155' | 'signature' | 'governance'>('erc20');

  const formik = useFormik({
    initialValues: {
      nftName: '',
      nftDescription: '',
      price: 0,
      imageContent: '',
      paymentTokenAddress: '',
      listingType: 'erc20',
      tokenId: 0,
      amount: 0,
      erc1155TokenAddress: ''
    },
    onSubmit: (values: any) => props.onSubmit(values)
  });

  const { values, handleChange, setFieldValue } = formik;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files && event.currentTarget.files[0]) {
      const file = event.currentTarget.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFieldValue('imageContent', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleListingTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = event.target.value as 'erc20' | 'erc1155' | 'signature' | 'governance';
    setListingType(selectedType);
    setFieldValue('listingType', selectedType);
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <label htmlFor="listingType">Listing Type</label>
      <select id="listingType" name="listingType" value={values.listingType} onChange={handleListingTypeChange} required>
        <option value="erc20">ERC20 Payment</option>
        <option value="erc1155">ERC1155 Listing</option>
        <option value="signature">Signature</option>
        <option value="governance">Governance Proposal</option>
      </select>

      {listingType === 'erc1155' && (
        <>
          <label htmlFor="erc1155TokenAddress">ERC1155 Token Address</label>
          <input
            id="erc1155TokenAddress"
            type="text"
            name="erc1155TokenAddress"
            value={values.erc1155TokenAddress}
            onChange={handleChange}
            required
          />

          <label htmlFor="tokenId">Token ID</label>
          <input
            id="tokenId"
            type="number"
            name="tokenId"
            value={values.tokenId}
            onChange={handleChange}
            required
          />

          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            name="amount"
            value={values.amount}
            onChange={handleChange}
            required
          />

<label htmlFor="nftName">NFT Name</label>
      <input
        id="nftName"
        type="text"
        name="nftName"
        value={values.nftName}
        onChange={handleChange}
        required
      />

      <label htmlFor="nftDescription">NFT Description</label>
      <textarea
        id="nftDescription"
        name="nftDescription"
        value={values.nftDescription}
        onChange={handleChange}
        required
      />

      <label htmlFor="price">Price</label>
      <input
        id="price"
        type="number"
        name="price"
        value={values.price}
        onChange={handleChange}
        required
      />
       <label htmlFor="image">Choose Image</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            required
          />
        </>
      )}
      
      

      {(listingType === 'erc20' || listingType === 'signature') && (
        <>
          <label htmlFor="nftName">NFT Name</label>
          <input
            id="nftName"
            type="text"
            name="nftName"
            value={values.nftName}
            onChange={handleChange}
            required
          />

          <label htmlFor="nftDescription">NFT Description</label>
          <textarea
            id="nftDescription"
            name="nftDescription"
            value={values.nftDescription}
            onChange={handleChange}
            required
          />

          <label htmlFor="price">Price</label>
          <input
            id="price"
            type="number"
            name="price"
            value={values.price}
            onChange={handleChange}
            required
          />

          <label htmlFor="paymentTokenAddress">Payment Token Address</label>
          <input
            id="paymentTokenAddress"
            type="text"
            name="paymentTokenAddress"
            value={values.paymentTokenAddress}
            onChange={handleChange}
            required
          />

          <label htmlFor="image">Choose Image</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            required
          />

          
        </>
      )}

      {listingType === 'governance' && (
        <>
          <label htmlFor="nftName">NFT Name</label>
          <input
            id="nftName"
            type="text"
            name="nftName"
            value={values.nftName}
            onChange={handleChange}
            required
          />

          <label htmlFor="nftDescription">NFT Description</label>
          <textarea
            id="nftDescription"
            name="nftDescription"
            value={values.nftDescription}
            onChange={handleChange}
            required
          />

          <label htmlFor="price">Price</label>
          <input
            id="price"
            type="number"
            name="price"
            value={values.price}
            onChange={handleChange}
            required
          />

          <label htmlFor="paymentTokenAddress">Payment Token Address</label>
          <input
            id="paymentTokenAddress"
            type="text"
            name="paymentTokenAddress"
            value={values.paymentTokenAddress}
            onChange={handleChange}
            required
          />

          <label htmlFor="image">Choose Image</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            required
          />
        </>
      )}

      <button type="submit">{listingType === 'governance' ? 'Create Proposal' : 'List NFT'}</button>
    </form>
  );
}
