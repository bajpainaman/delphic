import React from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import './WalletInfo.css';

const WalletInfo = ({ walletData, setWalletData }) => {
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(accounts[0]);
      const network = await provider.getNetwork();

      setWalletData({
        address: accounts[0],
        balance: formatEther(balance),
        network: network.name
      });

    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setWalletData(null);
  };

  return (
    <div className="wallet-container">
      <h2>Wallet Information</h2>
      
      {!walletData ? (
        <button onClick={connectWallet} className="connect-button">
          Connect Wallet
        </button>
      ) : (
        <div className="wallet-info">
          <div className="info-item">
            <label>Address:</label>
            <p>{`${walletData.address.substring(0, 6)}...${walletData.address.substring(38)}`}</p>
          </div>
          <div className="info-item">
            <label>Balance:</label>
            <p>{`${Number(walletData.balance).toFixed(4)} ETH`}</p>
          </div>
          <div className="info-item">
            <label>Network:</label>
            <p>{walletData.network}</p>
          </div>
          <button onClick={disconnectWallet} className="disconnect-button">
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletInfo;