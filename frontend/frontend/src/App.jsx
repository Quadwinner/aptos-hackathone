import React, { useState, useEffect } from "react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import "./App.css";

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);
const MODULE_ADDRESS = "0x03f4fe0fa07e8733ca0eb08be6d46e8ae929afdc33222164d79f5cdc89137970";
const OCTAS_PER_APT = 100000000; // 1 APT = 10^8 Octas

function App() {
  const [account, setAccount] = useState(null);
  const [lockedAmount, setLockedAmount] = useState(null);
  const [lockTime, setLockTime] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [customAmount, setCustomAmount] = useState("2");
  const [customDuration, setCustomDuration] = useState("60");
  const [remainingTime, setRemainingTime] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState({ amount: "2", duration: 60 });

  // Connect to Petra Wallet
  const connectWallet = async () => {
    if (window.aptos) {
      try {
        const response = await window.aptos.connect();
        setAccount(response.address);
        setMessage("Wallet connected successfully!");
        await fetchLockedTokenInfo(response.address);
        await fetchBalanceAndOptimize(response.address);
      } catch (error) {
        setMessage("Failed to connect wallet: " + error.message || error);
      }
    } else {
      setMessage("Please install Petra Wallet extension!");
    }
  };

  // Fetch balance and trigger AI optimization
  const fetchBalanceAndOptimize = async (address) => {
    try {
      const balance = await aptos.getAccountCoinAmount({
        accountAddress: address,
        coinType: "0x1::aptos_coin::AptosCoin",
      });
      const aptBalance = balance / OCTAS_PER_APT;
      setBalance(aptBalance);
      await optimizeLock(address, aptBalance);
    } catch (error) {
      setBalance("Unknown");
      console.error("Balance fetch error:", error);
    }
  };

  // AI: Optimize lock amount and duration
  const optimizeLock = async (address, balance) => {
    try {
      const transactions = await aptos.getAccountTransactions({
        accountAddress: address,
        options: { limit: 5 },
      });
      const recentActivity = transactions.length;
      const avgGas = transactions.reduce((sum, tx) => sum + (tx.gas_used || 0), 0) / (recentActivity || 1);

      const ledgerInfo = await aptos.getLedgerInfo();
      const blockHeight = parseInt(ledgerInfo.block_height);

      let amount = 2;
      let duration = 60;

      if (balance > 10 && recentActivity > 3) {
        amount = Math.min(balance * 0.3, 50);
        duration = 3600;
      } else if (balance > 5 && blockHeight % 1000 < 500) {
        amount = Math.min(balance * 0.2, 10);
        duration = 300;
      } else if (balance < 3) {
        amount = Math.min(balance * 0.5, 1);
        duration = 30;
      }

      if (avgGas > 2000) {
        duration *= 1.5;
      }

      setAiRecommendation({
        amount: amount.toFixed(2),
        duration: Math.round(duration),
      });
      setCustomAmount(amount.toFixed(2));
      setCustomDuration(Math.round(duration).toString());
    } catch (error) {
      console.error("AI optimization error:", error);
      setAiRecommendation({ amount: "2", duration: 60 });
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return "None";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  // Debug function to log the full resource
  const debugResource = async (address) => {
    try {
      const resource = await aptos.getAccountResource({
        accountAddress: address,
        resourceType: `${MODULE_ADDRESS}::Locker::LockedTokens`,
      });
      console.log("Full resource data:", resource);
      return resource;
    } catch (error) {
      console.log("Error fetching resource:", error);
      return null;
    }
  };

  // Fetch locked token info (amount and time)
  const fetchLockedTokenInfo = async (address) => {
    try {
      const resourceDebug = await debugResource(address);
      const resource = await aptos.getAccountResource({
        accountAddress: address,
        resourceType: `${MODULE_ADDRESS}::Locker::LockedTokens`,
      });
      console.log("Resource retrieved:", resource);

      let amount = "0";
      let unlockTime = null;

      if (resource) {
        if (resource.data && resource.data.amount) {
          amount = (parseInt(resource.data.amount) / OCTAS_PER_APT).toString(); // Convert from Octas to APT
          unlockTime = resource.data.unlock_time;
        } else if (resource.data && resource.data.value) {
          amount = (parseInt(resource.data.value) / OCTAS_PER_APT).toString();
          unlockTime = resource.data.unlock_time;
        } else if (resource.amount) {
          amount = (parseInt(resource.amount) / OCTAS_PER_APT).toString();
          unlockTime = resource.unlock_time;
        } else if (resource.value) {
          amount = (parseInt(resource.value) / OCTAS_PER_APT).toString();
          unlockTime = resource.unlock_time;
        }

        console.log("Amount found (in APT):", amount);
        console.log("Unlock time found:", unlockTime);

        setLockedAmount(amount);
        setLockTime(unlockTime);

        if (unlockTime) {
          const currentTime = Math.floor(Date.now() / 1000);
          const unlockTimeNum = parseInt(unlockTime);
          const timeLeft = unlockTimeNum - currentTime;
          setRemainingTime(timeLeft > 0 ? timeLeft : 0);
        } else {
          setRemainingTime(0);
        }
      } else {
        setLockedAmount("0");
        setLockTime(null);
        setRemainingTime(0);
      }
    } catch (error) {
      console.error("Error fetching locked token info:", error);
      setLockedAmount("0");
      setLockTime(null);
      setRemainingTime(0);
    }
  };

  // Lock tokens with custom amount and duration
  const lockTokens = async () => {
    if (!account) {
      setMessage("Please connect your wallet first!");
      return;
    }
    if (!customAmount || parseFloat(customAmount) <= 0) {
      setMessage("Please enter a valid amount to lock");
      return;
    }
    if (!customDuration || parseInt(customDuration) <= 0) {
      setMessage("Please enter a valid lock duration");
      return;
    }

    setLoading(true);
    setMessage("Processing transaction...");

    try {
      // Convert customAmount from APT to Octas
      const amountInOctas = Math.floor(parseFloat(customAmount) * OCTAS_PER_APT).toString();
      const durationInSeconds = parseInt(customDuration).toString();

      const payload = {
        function: `${MODULE_ADDRESS}::Locker::lock_tokens`,
        type_arguments: [],
        arguments: [amountInOctas, durationInSeconds], // Pass as strings
      };

      console.log("Sending transaction with payload:", payload);

      const response = await window.aptos.signAndSubmitTransaction(payload);
      setTxHash(response.hash);

      console.log("Transaction submitted:", response);

      await aptos.waitForTransaction({ transactionHash: response.hash });
      setMessage("Tokens locked successfully!");

      setTimeout(() => {
        fetchLockedTokenInfo(account);
        fetchBalanceAndOptimize(account);
      }, 2000);
    } catch (error) {
      console.error("Lock error:", error);
      setMessage("Lock failed: " + (error.message || error));
    }
    setLoading(false);
  };

  // Unlock tokens
  const unlockTokens = async () => {
    if (!account) {
      setMessage("Please connect your wallet first!");
      return;
    }
    if (remainingTime > 0) {
      setMessage(`Cannot unlock yet. ${formatTimeRemaining(remainingTime)} remaining.`);
      return;
    }
    setLoading(true);
    setMessage("Processing transaction...");
    try {
      const payload = {
        function: `${MODULE_ADDRESS}::Locker::unlock_tokens`,
        type_arguments: [],
        arguments: [],
      };
      console.log("Sending unlock transaction with payload:", payload);
      const response = await window.aptos.signAndSubmitTransaction(payload);
      setTxHash(response.hash);
      console.log("Unlock transaction submitted:", response);
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setMessage("Tokens unlocked successfully!");
      setTimeout(() => {
        fetchLockedTokenInfo(account);
        fetchBalanceAndOptimize(account);
      }, 2000);
    } catch (error) {
      console.error("Unlock error:", error);
      setMessage("Unlock failed: " + (error.message || error));
    }
    setLoading(false);
  };

  // Update remaining time every second
  useEffect(() => {
    let interval;
    if (remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          const newTime = prev - 1;
          return newTime > 0 ? newTime : 0;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [remainingTime]);

  // Fetch token info when account changes
  useEffect(() => {
    if (account) {
      fetchLockedTokenInfo(account);
      fetchBalanceAndOptimize(account);
      const interval = setInterval(() => {
        fetchLockedTokenInfo(account);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [account]);

  return (
    <div className="app-container">
      <div className="app-card">
        <div className="app-header">
          <h1>LiquidityLocker</h1>
          <p className="subtitle">AI-Powered Token Locking on Aptos Testnet</p>
        </div>

        <div className="wallet-section">
          {!account ? (
            <button className="connect-button" onClick={connectWallet}>
              Connect Petra Wallet
            </button>
          ) : (
            <div className="wallet-info">
              <div className="wallet-address">
                <span className="address-label">Connected:</span>
                <span className="address-value">{formatAddress(account)}</span>
              </div>
              <div className="wallet-balance">
                <span className="balance-label">Balance:</span>
                <span className="balance-value">{balance !== null ? `${balance} APT` : "Loading..."}</span>
              </div>
              <div className="wallet-balance">
                <span className="balance-label">Locked Amount:</span>
                <span className="balance-value">{lockedAmount !== null ? `${lockedAmount} APT` : "Loading..."}</span>
              </div>
              {remainingTime > 0 && (
                <div className="time-remaining">
                  <span className="time-label">Time Remaining:</span>
                  <span className="time-value">{formatTimeRemaining(remainingTime)}</span>
                </div>
              )}
              {aiRecommendation && (
                <div className="ai-suggestion">
                  <span className="ai-label">AI Recommendation:</span>
                  <span className="ai-value">
                    Lock {aiRecommendation.amount} APT for {formatTimeRemaining(aiRecommendation.duration)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {account && (
          <div className="custom-lock-section">
            <h3>Custom Token Lock</h3>
            <div className="input-group">
              <label htmlFor="custom-amount">Amount (APT):</label>
              <input
                id="custom-amount"
                type="number"
                min="0.1"
                step="0.1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Amount to lock"
              />
            </div>
            <div className="input-group">
              <label htmlFor="custom-duration">Duration (seconds):</label>
              <input
                id="custom-duration"
                type="number"
                min="1"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="Lock duration"
              />
            </div>
            <div className="duration-presets">
              <button onClick={() => setCustomDuration("60")}>1 min</button>
              <button onClick={() => setCustomDuration("300")}>5 min</button>
              <button onClick={() => setCustomDuration("3600")}>1 hour</button>
              <button onClick={() => setCustomDuration("86400")}>1 day</button>
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button
            className={`action-button lock-button ${loading ? "disabled" : ""}`}
            onClick={lockTokens}
            disabled={loading || !account}
          >
            {loading ? "Processing..." : `Lock ${customAmount} APT`}
          </button>
          <button
            className={`action-button unlock-button ${(loading || remainingTime > 0) ? "disabled" : ""}`}
            onClick={unlockTokens}
            disabled={loading || !account || remainingTime > 0}
          >
            {loading ? "Processing..." : "Unlock Tokens"}
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes("failed") || message.includes("Failed") || message.includes("Cannot") ? "error" : "success"}`}>
            {message}
          </div>
        )}

        {txHash && (
          <div className="transaction-info">
            <p>Transaction Hash:</p>
            <a
              href={`https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              {formatAddress(txHash)}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;