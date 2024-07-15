import { useFormik } from 'formik';

interface UploadImageFormValues {
  name: string;
  cost: number;
  url: string;
}

interface UploadImageFormProps {
  onSubmit: (values: UploadImageFormValues) => void;
}

export default function ImageForm(props: UploadImageFormProps) {
  const formik = useFormik({
    initialValues: {
      name: '',
      cost: 0,
      url: ''
    },
    onSubmit: (values: UploadImageFormValues) => props.onSubmit(values)
  });

  const { values, handleChange } = formik;

  return (
    <form onSubmit={formik.handleSubmit}>
      <label htmlFor="name">Name</label>
      <input
        id="name"
        type="text"
        name="name"
        value={values.name}
        onChange={handleChange}
        required
      />

      <label htmlFor="cost">Cost</label>
      <input
        id="cost"
        type="number"
        name="cost"
        value={values.cost}
        onChange={handleChange}
        required
      />

      <label htmlFor="url">URL</label>
      <input
        id="url"
        type="text"
        name="url"
        value={values.url}
        onChange={handleChange}
      />
      <button type="submit">Submit</button>
    </form>
  );
}