import React from 'react';
import { useFormik } from 'formik';
import './ImageForm.css';

interface UploadImageFormValues {
  nftName: string;
  nftDescription: string;
  price: number;
  imageUrl: string;
}

interface UploadImageFormProps {
  onSubmit: (values: UploadImageFormValues) => void;
}

export default function ImageForm(props: UploadImageFormProps) {
  const formik = useFormik({
    initialValues: {
      nftName: '',
      nftDescription: '',
      price: 0,
      imageUrl: ''
    },
    onSubmit: (values: UploadImageFormValues) => props.onSubmit(values)
  });

  const { values, handleChange, setFieldValue } = formik;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files && event.currentTarget.files[0]) {
      const file = event.currentTarget.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFieldValue('imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={formik.handleSubmit}>
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

      <label htmlFor="price">Price (in ETH)</label>
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

      <button type="submit">List NFT</button>
    </form>
  );
}
