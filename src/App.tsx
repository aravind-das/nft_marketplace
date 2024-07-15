import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './configs';
import ConnectWallet from './components/Wallet';
import ImageForm from './components/UploadImageForm';

const queryClient = new QueryClient();

interface UploadImageFormValues {
  nftName: string;
  nftDescription: string;
  price: number;
  imageUrl: string;
}

const handleSubmit = (args: UploadImageFormValues) => {
  // args prints the submitted form values
  console.log(args);
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="App">
          <div>Hello World</div>
          <ConnectWallet />
          <ImageForm onSubmit={handleSubmit}/>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
