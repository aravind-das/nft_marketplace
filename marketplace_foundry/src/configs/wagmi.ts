import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

export default createConfig({
  chains: [sepolia],
  connectors: [
    metaMask()
  ],
  transports: {
    [sepolia.id]: http(),
  },
});