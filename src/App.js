import React, { useState } from 'react';
import ApiForm from './components/ApiForm';
import WalletInfo from './components/WalletInfo';
import './App.css';

function App() {
  const [walletData, setWalletData] = useState(null);

  return (
    <div className="App">
      <h1>API Configuration</h1>
      <div className="content-container">
        <div className="form-section">
          <ApiForm />
        </div>
        <div className="wallet-section">
          <WalletInfo walletData={walletData} setWalletData={setWalletData} />
        </div>
      </div>
    </div>
  );
}

export default App;