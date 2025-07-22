import React, { useState, useEffect } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import {
  useSignAndExecuteTransaction,
  ConnectButton,
  useCurrentAccount,
  useSuiClient
} from '@mysten/dapp-kit';
import './App.css';

const LoyaltyCardPage = () => {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const [loading, setLoading] = useState(false);
  const [packageId, setPackageId] = useState('');
  const [mintForm, setMintForm] = useState({
    customerId: '',
    imageUrl: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [gasUsed, setGasUsed] = useState(null);
  const [balance, setBalance] = useState(null);
  const [customerBalance, setCustomerBalance] = useState(null);

  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Fetch SUI balance for any address
  const fetchBalance = async (address) => {
    try {
      const resp = await suiClient.getBalance({
        owner: address,
        coinType: '0x2::sui::SUI'
      });
      return Number(resp.totalBalance) / 1_000_000_000;
    } catch {
      return null;
    }
  };

  // Fetch connected wallet balance
  useEffect(() => {
    if (currentAccount) {
      fetchBalance(currentAccount.address).then(setBalance);
    }
  }, [currentAccount]);

  // Fetch customer wallet balance when address changes
  useEffect(() => {
    const fetchCustomer = async () => {
      if (mintForm.customerId && mintForm.customerId.length === 42) {
        const bal = await fetchBalance(mintForm.customerId);
        setCustomerBalance(bal);
      } else {
        setCustomerBalance(null);
      }
    };
    fetchCustomer();
  }, [mintForm.customerId]);

  const handleMintChange = (e) => {
    setMintForm({ ...mintForm, [e.target.name]: e.target.value });
    setShowSuccess(false);
    setGasUsed(null);
    setBalance(null);
  };

  // Action: mint a new Loyalty card
  const mintLoyalty = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet');
      return;
    }
    try {
      setLoading(true);
      setGasUsed(null);
      setBalance(null);
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::loyalty_card::mint_loyalty`,
        arguments: [
          tx.pure.address(mintForm.customerId),
          tx.pure.string(mintForm.imageUrl)
        ]
      });
      const result = await signAndExecute({ transaction: tx });
      // Extract gas used from result
      const effects = result?.effects || result?.effectsCert?.effects;
      const gasUsedObj = effects?.gasUsed;
      const gasUsedVal = gasUsedObj
        ? (Number(gasUsedObj.computationCost || 0) +
           Number(gasUsedObj.storageCost || 0) +
           Number(gasUsedObj.storageRebate || 0)) / 1_000_000_000
        : null;
      setGasUsed(gasUsedVal);

      // Fetch new balance
      const newBalance = await fetchBalance(currentAccount.address);
      setBalance(newBalance);

      setMintForm({ customerId: '', imageUrl: '' });
      setShowSuccess(true);
    } catch (error) {
      console.error('Error minting loyalty card:', error);
      alert(`Minting failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Wallet Info Box (hover to show) */}
      {currentAccount && (
        <div className="wallet-info-hover-area">
          <div className="wallet-info-box">
            <div>
              <strong>Wallet:</strong> {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
            </div>
            {balance !== null && (
              <div>
                <strong>Balance:</strong> {balance.toFixed(6)} SUI
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container">
        <div className="info-banner">
          Mint your unique SUI Loyalty NFT card! Enter your wallet address and image URL below.
        </div>
        <div className="connect-btn-wrapper">
          <ConnectButton />
        </div>
        <div className="package-input">
          <label>Package ID</label>
          <input
            type="text"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            placeholder="Enter Package ID"
          />
        </div>
        <section className="form-section">
          <label>Wallet Address</label>
          <input
            type="text"
            name="customerId"
            value={mintForm.customerId}
            onChange={handleMintChange}
            placeholder="Enter Customer Sui Address"
          />
          {customerBalance !== null && (
            <div style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>
              <strong>Customer Balance:</strong> {customerBalance.toFixed(6)} SUI
            </div>
          )}
          <label>Image URL</label>
          <input
            type="text"
            name="imageUrl"
            value={mintForm.imageUrl}
            onChange={handleMintChange}
            placeholder="Enter Image URL"
          />
          {/* Image Preview */}
          {mintForm.imageUrl && (
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <img
                src={mintForm.imageUrl}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '180px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border-color)',
                  boxShadow: '0 2px 8px rgba(255, 126, 95, 0.09)',
                  marginTop: '0.5rem'
                }}
                onError={e => (e.target.style.display = 'none')}
              />
            </div>
          )}
          <button
            onClick={mintLoyalty}
            disabled={
              loading ||
              !mintForm.customerId.trim() ||
              !mintForm.imageUrl.trim()
            }
          >
            {loading ? 'Minting...' : 'Mint your NFT'}
          </button>
          {showSuccess && (
            <div className="success-banner">
              🎉 Success! Your loyalty card NFT has been minted.
              {gasUsed !== null && (
                <div style={{ marginTop: '0.7rem', fontSize: '1rem' }}>
                  <strong>Gas used:</strong> {gasUsed.toFixed(6)} SUI
                </div>
              )}
              {balance !== null && (
                <div style={{ marginTop: '0.3rem', fontSize: '1rem' }}>
                  <strong>Remaining balance:</strong> {balance.toFixed(6)} SUI
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default LoyaltyCardPage;