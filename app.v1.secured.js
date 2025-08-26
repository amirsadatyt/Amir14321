// AuraSan sanitizer module
const AuraSan = (() => {
  const ALLOW_TAGS = new Set(['IMG', 'BR', 'P', 'STRONG', 'EM', 'UL', 'LI', 'A']);
  const ALLOW_ATTR = new Set(['src','alt','title','href','rel','target']);

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function basicSanitize(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const walk = (node) => {
      [...node.children].forEach(el => {
        if (!ALLOW_TAGS.has(el.tagName)) { el.replaceWith(document.createTextNode(el.textContent)); return; }
        [...el.attributes].forEach(attr => {
          const n = attr.name.toLowerCase();
          if (!ALLOW_ATTR.has(n)) el.removeAttribute(attr.name);
          const v = (el.getAttribute(attr.name) || '').trim();
          if (n === 'href' || n === 'src') {
            const safe = v.startsWith('https://') || v.startsWith('http://') || v.startsWith('data:image/');
            if (!safe) el.removeAttribute(attr.name);
          }
        });
        walk(el);
      });
    };
    walk(tpl.content || tpl);
    return tpl.innerHTML;
  }

  function toTrusted(html){
    try {
      if (window.trustedTypes) {
        const p = window.trustedTypes.getPolicy('aura') || window.trustedTypes.createPolicy('aura', { createHTML: s => s });
        return p.createHTML(html);
      }
    } catch(e){}
    return html;
  }

  function clean(html) {
    try {
      if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
        return toTrusted(window.DOMPurify.sanitize(String(html), { RETURN_TRUSTED_TYPE: !!window.trustedTypes }));
      }
    } catch(e){}
    return toTrusted(basicSanitize(String(html)));
  }

  function setHTML(el, html) {
    el.innerHTML = '';
    const safe = clean(html);
    el.innerHTML = safe;
  }

  function text(s){ return escapeHtml(String(s)); }

  return { setHTML, clean, text };
})();


/* App bundle: wrapped sanitization + integrity helpers */
(function(window){
  // Basic safe-escape fallback if DOMPurify isn't available
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(s){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s];
    });
  }
  window.sanitizeHTML = function(input){
    try {
      if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
        return window.DOMPurify.sanitize(String(input));
      }
    } catch(e){}
    // fallback: allow a limited safe subset by escaping everything except <a> and <strong><em><p><br><ul><li>
    // For simplicity fallback to full escape (safe but removes formatting)
    return escapeHtml(input);
  };
})(window);



// Polyfill Buffer if not available (for Edge/Supabase/browser environments)
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = {
    from: (input, encoding) => {
      if (encoding === 'base64') {
        const binary = atob(input);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      }
      return new TextEncoder().encode(input);
    }
  };
}

        import { ethers } from "./ethers.min.js";
        // --- SUPABASE CONFIGURATION ---
        const SUPABASE_URL = 'https://hdvqbcjtublfuykigsui.supabase.co';
        // <-- REPLACE WITH YOUR SUPABASE URL
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkdnFiY2p0dWJsZnV5a2lnc3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTk4OTAsImV4cCI6MjA3MTUzNTg5MH0.Gog9zohe1bz6gihtssCBPUYkfNMbAjuQKR4Qvb3HNOg';
        // <-- REPLACE WITH YOUR SUPABASE ANON KEY
        const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/api`;
        // --- XSS PREVENTION UTILITY ---
        const sanitizeHTML = (str) => {
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        };

        // --- CORE BANKNOTE CLIENT-SIDE LOGIC ---
        const CoreLogic = (() => {
            const Constants = { VALIDATION_PREFIX: "SADAT_V2_PART", MAX_IMAGE_DIMENSION: 2000, NUM_QR_CODES: 9 };
            const Utils = {
                preprocessImage: (dataUrl) => new Promise((resolve, reject) => {
               
                     const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
              
                          canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.filter = 'grayscale(1) contrast(2.5) brightness(1.1)';
                        ctx.drawImage(img, 0, 0);
       
                         resolve(canvas.toDataURL('image/jpeg'));
                    };
                    img.onerror = reject;
                    img.src = dataUrl;
                }),
   
                     resizeImage: (file, maxDimension) => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let { width, height } = img;
                            if (width > height) {
                                if (width > maxDimension) { height *= maxDimension / width;
                                width = maxDimension; }
                            } else {
                                if (height > maxDimension) { width *= maxDimension / height;
                                height = maxDimension; }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg'));
                        };
                        img.onerror = reject;
                        img.src = e.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }),
            };
            const Banknote = {
                getLayout: (imageWidth) => {
                    const standardWidth = 790;
                    // The reference width of the banknote layout
                    const scale = imageWidth / standardWidth;
                    return {
                        qrSize: Math.round(250 * scale),
                        xSpacing: Math.round(20 * scale),
                        ySpacing: Math.round(20 * scale),
                  
                     };
                },
                decodeQrGrid: async (imageData, statusEl) => {
                    const layout = Banknote.getLayout(imageData.width);
                    const parts = {};
                    let count = 0;
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = imageData.width;
                    canvas.height = imageData.height;
                    ctx.putImageData(imageData, 0, 0);

                    for (let i = 0; i < Constants.NUM_QR_CODES; i++) {
                        setStatus(statusEl, `Scanning section ${i + 1}/${Constants.NUM_QR_CODES}...`, 'info');
                        await new Promise(r => setTimeout(r, 5));
                        
                        const row = Math.floor(i / 3), col = i % 3;
                        const regionX = col * (layout.qrSize + layout.xSpacing);
                        const regionY = row * (layout.qrSize + layout.ySpacing);
                        const data = ctx.getImageData(regionX, regionY, layout.qrSize, layout.qrSize);
                        
                        const code = jsQR(data.data, data.width, data.height);
                        if (code && code.data.startsWith(Constants.VALIDATION_PREFIX)) {
                            const match = code.data.substring(Constants.VALIDATION_PREFIX.length).match(/^(\d+)\/(\d+):(.*)$/s);
                            if (match) {
                                const partNum = parseInt(match[1], 10);
                                if (!parts[partNum]) {
                                    parts[partNum] = match[3];
                                    count++;
                                }
                            }
                        }
                    }

                    if (count < Constants.NUM_QR_CODES) {
   
                                         throw new Error(`Scan failed. Found ${count}/${Constants.NUM_QR_CODES} valid sections.`);
                    }
                    let payload = '';
                    for (let i = 1; i <= Constants.NUM_QR_CODES; i++) {
                        payload += parts[i];
                    }
                    return payload;
                }
            };
            return { Constants, Utils, Banknote };
        })();
        // --- PERFORMANCE OPTIMIZATION MODULES ---
        const CacheManager = { cache: new Map(), DEFAULT_CACHE_DURATION: 30000, set(key, data, duration = this.DEFAULT_CACHE_DURATION) { this.cache.set(key, { data, expiresAt: Date.now() + duration });
        }, get(key) { const cached = this.cache.get(key); if (!cached) return null; if (Date.now() > cached.expiresAt) { this.cache.delete(key); return null;
        } return cached.data; }, invalidate(pattern) { for (const key of this.cache.keys()) { if (key.includes(pattern)) { this.cache.delete(key); } } } };
        const NetworkOptimizer = { getSyncStrategy() { const speed = navigator.connection?.effectiveType || '4g';
        switch (speed) { case 'slow-2g': case '2g': return { interval: 45000, useCache: true, cacheDuration: 120000 };
        case '3g': return { interval: 20000, useCache: true, cacheDuration: 60000 };
        case '4g': default: return { interval: 10000, useCache: true, cacheDuration: 20000 }; } } };
        const BackgroundSync = { isRunning: false, syncIntervalId: null, start() { if (this.isRunning) return; console.log("Starting background sync..."); this.isRunning = true;
        const strategy = NetworkOptimizer.getSyncStrategy(); const performSyncCycle = () => { if (!this.isRunning) return; this.performSync().catch(err => console.error("Background sync error:", err)); };
        performSyncCycle(); this.syncIntervalId = setInterval(performSyncCycle, strategy.interval); }, async performSync() { if (!state.wallet) { this.stop(); return; } const syncStatusEl = document.getElementById('sync-status');
        try { const [incomingTxs, outgoingTxs] = await Promise.all([ SupabaseLedger.findIncomingTxs(state.wallet.address), SupabaseLedger.findOutgoingTxs(state.wallet.address) ]); let newTxCount = 0;
        for (const confirmation of incomingTxs) { if (await WalletLogic.processDiscoveredTransaction(confirmation)) { newTxCount++; } } const balance = WalletLogic.calculateBalanceFromTxs(incomingTxs, outgoingTxs);
        state.currentBalance = balance; document.getElementById('balance-display').textContent = `$${parseFloat(ethers.formatUnits(balance, state.config.PRECISION)).toFixed(2)}`; if (newTxCount > 0) { renderTransactionHistory(); if (syncStatusEl) { setStatus(syncStatusEl, '⚡ New transaction(s) detected!', 'success');
        setTimeout(() => { if (syncStatusEl) setStatus(syncStatusEl, ''); }, 4000); } } } catch (error) { console.error("Background sync failed:", error);
        if (syncStatusEl) setStatus(syncStatusEl, 'Sync failed. Retrying...', 'error'); } }, stop() { if (!this.isRunning) return; console.log("Stopping background sync..."); clearInterval(this.syncIntervalId);
        this.syncIntervalId = null; this.isRunning = false; } };
        
        // --- SUPABASE LEDGER MODULE ---
        const SupabaseLedger = (() => {
            const apiCall = async (action, payload) => {
  const envelope = {
    action,
    payload,
    ts: Date.now(),
    nonce: crypto.getRandomValues(new Uint32Array(4))[0].toString(16)
  };
  const canonical = JSON.stringify(envelope, Object.keys(envelope).sort());
  let sig = 'unsigned';
  try {
    if (state.wallet?.signMessage) {
      sig = await state.wallet.signMessage(canonical);
    }
  } catch(e){ console.warn('Signing failed', e); }

                const response = await fetch(EDGE_FUNCTION_URL, {
                    method: 'POST',
             
                       headers: { 'Content-Type': 'application/json',
      'X-Aura-Addr': state.wallet?.address || 'anonymous',
      'X-Aura-Sig': sig,
      'X-Aura-Canonical': ethers.sha256(ethers.toUtf8Bytes(canonical)), 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                    body: JSON.stringify({ action, payload })
                });
                const result = await response.json();
                if (!response.ok || result.error) {
      
                                 throw new Error(result.error || `Supabase API error! Status: ${response.status}`);
                }
                return result.data;
            };

            return {
                getAppConfig: () => apiCall('getAppConfig'),
 
                               validateBanknote: (banknotePayload) => apiCall('validateBanknote', { banknotePayload }),
                recordSpentIdentifier: (identifier, type) => apiCall('recordSpentIdentifier', { identifier, type }),
                hasBeenSpent: async (identifier) => { try { const result = await apiCall('hasBeenSpent', { identifier });
                return result.spent; } catch (error) { console.error('Failed to check identifier status on Supabase:', error);
                alert(`Critical Error: Could not read from the public ledger. Cannot verify transaction safety. Reason: ${error.message}`); return true;
                } },
                pinConfirmation: (confirmation) => apiCall('pinConfirmation', { confirmation }),
                findConfirmation: (txHash) => apiCall('findConfirmation', { txHash }),
                findIncomingTxs: async (receiverAddress) => { const cacheKey = `incoming_${receiverAddress}`;
                const strategy = NetworkOptimizer.getSyncStrategy(); if (strategy.useCache) { const cached = CacheManager.get(cacheKey); if (cached) return cached;
                } const txs = await apiCall('findIncomingTxs', { receiverAddress }); if (strategy.useCache) CacheManager.set(cacheKey, txs, strategy.cacheDuration); return txs;
                },
                findOutgoingTxs: async (senderAddress) => { const cacheKey = `outgoing_${senderAddress}`;
                const strategy = NetworkOptimizer.getSyncStrategy(); if (strategy.useCache) { const cached = CacheManager.get(cacheKey); if (cached) return cached;
                } const txs = await apiCall('findOutgoingTxs', { senderAddress }); if (strategy.useCache) CacheManager.set(cacheKey, txs, strategy.cacheDuration); return txs;
                },
                getSpendDetails: (identifier) => apiCall('getSpendDetails', { identifier }),
                findTransactionById: (transactionId) => apiCall('findTransactionById', { transactionId })
            };
        })();
        // AURA PROTOCOL - DECENTRALIZED WALLET APPLICATION
        const AppConstants = { MAX_LOGIN_ATTEMPTS: 5, LOGIN_LOCKOUT_PERIOD: 30000, POLLING_INTERVAL: 5000, PAYMENT_REQUEST_EXPIRY: 9 * 60 * 1000, PRECISION: 8 };
        let state = { wallet: null, userStore: null, failedLoginAttempts: 0, isLockedOut: false, activePaymentRequest: null, activeManualSend: null, activePollingTimer: null, cameraStream: null, isScannerActive: false, currentBalance: 0n, transactionIndex: new Map(), config: null };
        const WalletLogic = {
            createWallet: (password) => { const wallet = ethers.Wallet.createRandom();
            const mnemonic = wallet.mnemonic.phrase; const encryptedJson = wallet.encryptSync(password); const genesisHash = ethers.id("GENESIS_BLOCK"); const userStore = { publicKey: wallet.publicKey, address: wallet.address, encryptedJson: encryptedJson, chain: [{ id: parseInt(genesisHash.slice(-10), 16), hash: genesisHash, type: 'creation', timestamp: Date.now() }] };
            localStorage.setItem('aura_user_store', JSON.stringify(userStore)); state.userStore = userStore; state.wallet = wallet; return { mnemonic };
            },
            restoreWallet: async (mnemonic, password) => { try { const wallet = ethers.Wallet.fromPhrase(mnemonic);
            const encryptedJson = wallet.encryptSync(password); const genesisHash = ethers.id("GENESIS_BLOCK"); const userStore = { publicKey: wallet.publicKey, address: wallet.address, encryptedJson: encryptedJson, chain: [{ id: parseInt(genesisHash.slice(-10), 16), hash: genesisHash, type: 'creation', timestamp: Date.now() }] };
            localStorage.setItem('aura_user_store', JSON.stringify(userStore)); state.userStore = userStore; state.wallet = wallet; return true; } catch (e) { console.error("Restore failed:", e); return false;
            } },
            login: async (password) => { const userStoreJson = localStorage.getItem('aura_user_store');
            if (!userStoreJson) return null; try { const reloadedUserStore = JSON.parse(userStoreJson); const wallet = await ethers.Wallet.fromEncryptedJson(reloadedUserStore.encryptedJson, password); state.userStore = reloadedUserStore;
            state.wallet = wallet; state.failedLoginAttempts = 0; WalletLogic.buildTransactionIndex(); return true; } catch (e) { console.error("Login failed (likely incorrect password):", e); state.failedLoginAttempts++;
            return false; } },
            logout: () => { BackgroundSync.stop();
            state.wallet = null; state.userStore = null; state.transactionIndex.clear(); },
            buildTransactionIndex: () => { state.transactionIndex.clear();
            if (!state.userStore || !state.userStore.chain) return; state.userStore.chain.forEach(tx => { const txKey = tx.linkedTxHash || tx.hash; state.transactionIndex.set(txKey, tx); });
            },
            getLastTransaction: () => state.userStore.chain[state.userStore.chain.length - 1],
            addToChain: (txData) => { const prevTx = WalletLogic.getLastTransaction();
            const newTx = { ...txData, prevHash: prevTx.hash, timestamp: txData.timestamp || Date.now() }; const amountInt = ethers.parseUnits((newTx.amount || 0).toString(), state.config.PRECISION);
            const feeInt = ethers.parseUnits((newTx.fee || 0).toString(), state.config.PRECISION); newTx.hash = ethers.solidityPackedKeccak256( ['string', 'uint256', 'uint256', 'string', 'string', 'string'], [newTx.type, amountInt, feeInt, newTx.from || '', newTx.to || '', newTx.prevHash] );
            if (txData.id) { newTx.id = txData.id; } else { newTx.id = parseInt(newTx.hash.slice(-10), 16); } state.userStore.chain.push(newTx); localStorage.setItem('aura_user_store', JSON.stringify(state.userStore)); const txKey = newTx.linkedTxHash || newTx.hash; state.transactionIndex.set(txKey, newTx); return newTx;
            },
            calculateBalanceFromTxs: (incomingTxs, outgoingTxs) => { const precision = state.config.PRECISION; let incomingTotal = 0n; incomingTxs.forEach(tx => { incomingTotal += ethers.parseUnits((Number(tx.amount) || 0).toString(), precision); });
            let outgoingTotal = 0n; outgoingTxs.forEach(tx => { outgoingTotal += ethers.parseUnits((Number(tx.amount) || 0).toString(), precision); }); return incomingTotal - outgoingTotal; },
            getServerAuthoritativeBalance: async () => { if (!state.userStore) return 0n;
            const [incomingTxs, outgoingTxs] = await Promise.all([ SupabaseLedger.findIncomingTxs(state.wallet.address), SupabaseLedger.findOutgoingTxs(state.wallet.address) ]); const balance = WalletLogic.calculateBalanceFromTxs(incomingTxs, outgoingTxs); state.currentBalance = balance; return balance;
            },
            getStandardizedConfirmationMessage: (confirmation) => {
                const amount = Number(confirmation.amount).toFixed(state.config.PRECISION);
                return [
                    confirmation.type,
                    confirmation.senderAddress,
                    confirmation.receiverAddress,
                    amount,
                    confirmation.linkedTxHash,
                    confirmation.comment || ''
                ].join('|');
            },
            createPaymentRequest: (amount) => { const receiveTx = WalletLogic.addToChain({ type: 'receive', amount: amount, from: '', to: state.wallet.address, status: 'pending_request' });
            return { type: 'AURA_PAYMENT_REQUEST', receiverAddress: state.wallet.address, amount: amount, linkedTxHash: receiveTx.hash, expiresAt: Date.now() + state.config.PAYMENT_REQUEST_EXPIRY };
            },
            processPayment: async (request) => { if (!state.config?.TREASURY_ADDRESS) throw new Error("CRITICAL: Treasury address is not configured.");
            const precision = state.config.PRECISION; const amountBI = ethers.parseUnits(request.amount.toString(), precision);
            const feeBI = (amountBI * BigInt(Math.round(state.config.FEE_PERCENTAGE * 1000))) / 1000n; const totalDebitBI = amountBI + feeBI;
            if (Date.now() > request.expiresAt) throw new Error("Payment request has expired.");
            if (state.currentBalance < totalDebitBI) throw new Error(`Insufficient funds. You need $${parseFloat(ethers.formatUnits(totalDebitBI, precision)).toFixed(2)}.`);
            if (await SupabaseLedger.hasBeenSpent(request.linkedTxHash)) throw new Error("This payment request has already been processed."); await SupabaseLedger.recordSpentIdentifier(request.linkedTxHash, 'transaction');
            const amountNum = parseFloat(ethers.formatUnits(amountBI, precision)); const feeNum = parseFloat(ethers.formatUnits(feeBI, precision));
            const mainTx = WalletLogic.addToChain({ type: 'send', amount: amountNum, fee: feeNum, from: state.wallet.address, to: request.receiverAddress, status: 'completed', linkedTxHash: request.linkedTxHash });
            const confirmation = { type: 'AURA_PAYMENT_CONFIRMATION', senderAddress: state.wallet.address, receiverAddress: request.receiverAddress, amount: amountNum, linkedTxHash: request.linkedTxHash, id: mainTx.id }; const messageToSign = WalletLogic.getStandardizedConfirmationMessage(confirmation);
            confirmation.signature = await state.wallet.signMessage(messageToSign); confirmation.signedMessage = messageToSign; await SupabaseLedger.pinConfirmation(confirmation);
            const feeTx = WalletLogic.addToChain({ type: 'send', amount: feeNum, fee: 0, from: state.wallet.address, to: state.config.TREASURY_ADDRESS, status: 'completed', purpose: 'fee' });
            const feeConfirmation = { type: 'AURA_PAYMENT_CONFIRMATION', senderAddress: state.wallet.address, receiverAddress: state.config.TREASURY_ADDRESS, amount: feeNum, linkedTxHash: feeTx.hash, id: feeTx.id }; const feeMessageToSign = WalletLogic.getStandardizedConfirmationMessage(feeConfirmation);
            feeConfirmation.signature = await state.wallet.signMessage(feeMessageToSign); feeConfirmation.signedMessage = feeMessageToSign; await SupabaseLedger.pinConfirmation(feeConfirmation); CacheManager.invalidate(state.wallet.address); return true;
            },
            directSend: async (recipientAddress, amount, comment) => {
                if (!state.config?.TREASURY_ADDRESS) throw new Error("CRITICAL: Treasury address is not configured.");
                const precision = state.config.PRECISION;
                const amountBI = ethers.parseUnits(amount.toString(), precision);
                const feeBI = (amountBI * BigInt(Math.round(state.config.FEE_PERCENTAGE * 1000))) / 1000n;
                const totalDebitBI = amountBI + feeBI;

                if (state.currentBalance < totalDebitBI) throw new Error(`Insufficient funds to cover amount + fee.`);

                const amountNum = parseFloat(ethers.formatUnits(amountBI, precision));
                const feeNum = parseFloat(ethers.formatUnits(feeBI, precision));
                
                const sendTx = WalletLogic.addToChain({ type: 'send', amount: amountNum, fee: feeNum, from: state.wallet.address, to: recipientAddress, status: 'completed', comment: comment });

                const confirmation = {
                    type: 'AURA_PAYMENT_CONFIRMATION',
                    senderAddress: state.wallet.address,
                    receiverAddress: recipientAddress,
                    amount: amountNum,
                    linkedTxHash: sendTx.hash,
                    id: sendTx.id,
                    comment: comment
                };
                const messageToSign = WalletLogic.getStandardizedConfirmationMessage(confirmation);
                confirmation.signature = await state.wallet.signMessage(messageToSign);
                confirmation.signedMessage = messageToSign;
                await SupabaseLedger.pinConfirmation(confirmation);

                const feeTx = WalletLogic.addToChain({ type: 'send', amount: feeNum, fee: 0, from: state.wallet.address, to: state.config.TREASURY_ADDRESS, status: 'completed', purpose: 'fee' });
                const feeConfirmation = { type: 'AURA_PAYMENT_CONFIRMATION', senderAddress: state.wallet.address, receiverAddress: state.config.TREASURY_ADDRESS, amount: feeNum, linkedTxHash: feeTx.hash, id: feeTx.id };
                const feeMessageToSign = WalletLogic.getStandardizedConfirmationMessage(feeConfirmation);
                feeConfirmation.signature = await state.wallet.signMessage(feeMessageToSign);
                feeConfirmation.signedMessage = feeMessageToSign;
                await SupabaseLedger.pinConfirmation(feeConfirmation);
                
                CacheManager.invalidate(state.wallet.address);
                return true;
            },
            finalizePayment: async (confirmation) => { const receiveTxIndex = state.userStore.chain.findIndex(tx => tx.hash === confirmation.linkedTxHash && tx.status === 'pending_request');
            if (receiveTxIndex === -1) { console.error("Finalize Error: Could not find pending transaction."); return false;
            } if (!confirmation.signedMessage) { console.error("Finalize Error: Receipt is missing 'signedMessage'."); return false; } const locallyRecreatedMessage = WalletLogic.getStandardizedConfirmationMessage(confirmation);
            if (locallyRecreatedMessage !== confirmation.signedMessage) { console.error("Tamper Detection: Confirmation data mismatch."); return false; } const signerAddress = ethers.verifyMessage(confirmation.signedMessage, confirmation.signature);
            if (signerAddress !== confirmation.senderAddress) { console.error("Signature verification failed!"); return false; } state.userStore.chain[receiveTxIndex].status = 'completed'; state.userStore.chain[receiveTxIndex].from = confirmation.senderAddress; localStorage.setItem('aura_user_store', JSON.stringify(state.userStore)); CacheManager.invalidate(state.wallet.address);
            return true; },
            processDiscoveredTransaction: async (confirmation) => { if (confirmation.receiverAddress !== state.wallet.address) return false;
            const txKey = confirmation.linkedTxHash || confirmation.hash; const existingTx = state.userStore.chain.find(tx => tx.linkedTxHash === txKey && tx.from === confirmation.senderAddress && tx.amount === confirmation.amount);
            if (existingTx) return false; if (confirmation.senderAddress !== 'BANKNOTE_ISSUER') { if (!confirmation.signedMessage) { console.error("Discovered TX invalid: Missing 'signedMessage'"); return false;
            } const locallyRecreatedMessage = WalletLogic.getStandardizedConfirmationMessage(confirmation); if (locallyRecreatedMessage !== confirmation.signedMessage) { console.error("Discovered TX failed tamper check"); return false;
            } const signerAddress = ethers.verifyMessage(confirmation.signedMessage, confirmation.signature); if (signerAddress !== confirmation.senderAddress) { console.error("Discovered TX failed signature validation"); return false;
            } } WalletLogic.addToChain({ id: confirmation.id, type: confirmation.senderAddress === 'BANKNOTE_ISSUER' ? 'charge' : 'receive', amount: confirmation.amount, from: confirmation.senderAddress, to: state.wallet.address, status: 'completed', linkedTxHash: confirmation.linkedTxHash, timestamp: confirmation.timestamp, comment: confirmation.comment });
            return true; }
        };
        
        function setLoader(loaderId, isLoading) { document.getElementById(loaderId).classList.toggle('hidden', !isLoading);
        }
        function setStatus(element, message, type = '') {
            element.textContent = message;
            element.className = 'status-box'; // Reset classes
            if (type) element.classList.add(type);
        }
        function resetViewInputs(viewId) { const view = document.getElementById(viewId); if (!view) return;
        view.querySelectorAll('input, textarea').forEach(input => { if (input.type !== 'file') input.value = ''; }); const statusBox = view.querySelector('.status-box');
        if (statusBox) statusBox.textContent = ''; }
        async function updateBalanceAndRender() { try { const balance = await WalletLogic.getServerAuthoritativeBalance();
        document.getElementById('balance-display').textContent = `$${parseFloat(ethers.formatUnits(balance, state.config.PRECISION)).toFixed(2)}`; renderTransactionHistory(); } catch (error) { console.error("Could not update balance:", error); document.getElementById('balance-display').textContent = 'Error';
        } }
        function generateQrCode(data, containerId) { const container = document.getElementById(containerId); container.textContent = '';
        const qr = qrcode(0, 'L'); qr.addData(data); qr.make(); container.innerHTML = sanitizeHTML(qr.createImgTag(6, 10));
        }
        function abbreviateAddress(address) { if (!address) return ''; return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        }
        function stopScanner() { if (state.cameraStream) { state.cameraStream.getTracks().forEach(track => track.stop()); state.cameraStream = null;
        state.isScannerActive = false; } }
        async function startScanner() { if (state.isScannerActive || !document.getElementById('send-view').classList.contains('active')) return;
        state.isScannerActive = true; const video = document.getElementById('qr-video'), loadingMessage = document.getElementById('loading-message'), canvasElement = document.getElementById('qr-canvas'), canvas = canvasElement.getContext('2d'), sendStatusEl = document.getElementById('send-status');
        setStatus(sendStatusEl, ''); loadingMessage.style.display = 'flex'; loadingMessage.textContent = 'Requesting camera access...';
        try { state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); video.srcObject = state.cameraStream; video.setAttribute("playsinline", true); await video.play();
        loadingMessage.style.display = 'none'; requestAnimationFrame(tick); } catch (err) { console.error("Camera Error:", err); loadingMessage.textContent = "Could not access camera.";
        setStatus(sendStatusEl, 'Camera access is required.', 'error'); state.isScannerActive = false; } function tick() { if (!state.isScannerActive) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) { canvasElement.height = video.videoHeight; canvasElement.width = video.videoWidth; canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height); const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code) { stopScanner(); setStatus(sendStatusEl, 'QR Code Detected! Processing...', 'info'); let isPaymentRequest = false; try { const request = JSON.parse(code.data);
        if (request.type === 'AURA_PAYMENT_REQUEST' && request.amount && request.receiverAddress) { isPaymentRequest = true;
        Promise.resolve().then(async () => { if (Date.now() > request.expiresAt) throw new Error("This payment request has expired."); if (await SupabaseLedger.hasBeenSpent(request.linkedTxHash)) throw new Error("This payment request has already been paid."); state.activePaymentRequest = request; state.activeManualSend = null; const fee = request.amount * state.config.FEE_PERCENTAGE; const total = request.amount + fee; document.getElementById('confirm-amount-display').innerHTML = sanitizeHTML(`Amount: $${sanitizeHTML(request.amount.toFixed(2))}<br><span style="font-size: 14px; color: #555;">Fee (${(state.config.FEE_PERCENTAGE*100).toFixed(1)}%): +$${sanitizeHTML(fee.toFixed(2))}</span><br><strong style="font-size: 18px;">Total: $${sanitizeHTML(total.toFixed(2))}</strong>`); document.getElementById('confirm-recipient-address-display').textContent = request.receiverAddress; await showView('send-confirm-view'); }).catch(err => { setStatus(sendStatusEl, err.message, 'error'); setTimeout(() => startScanner(), 2000);
        }); } } catch (e) {} if (!isPaymentRequest) { if (ethers.isAddress(code.data)) { document.getElementById('send-address-input').value = code.data;
        setStatus(sendStatusEl, 'Recipient address scanned! Please enter the amount to send.', 'success'); document.getElementById('send-amount-input').focus();
        } else { setStatus(sendStatusEl, 'Invalid QR Code. Not a valid address or payment request.', 'error'); setTimeout(() => startScanner(), 2000);
        } } return; } } requestAnimationFrame(tick); } }
        async function showView(id) { if (document.getElementById('send-view').classList.contains('active') && id !== 'send-view') stopScanner();
        if (state.activePollingTimer) { clearInterval(state.activePollingTimer); state.activePollingTimer = null; } document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); const viewElement = document.getElementById(id); if(viewElement) viewElement.classList.add('active');
        if (id === 'wallet-view') { document.getElementById('balance-display').textContent = 'Loading...'; if(state.wallet) document.getElementById('address-display').textContent = abbreviateAddress(state.wallet.address); await updateBalanceAndRender(); BackgroundSync.start();
        } if (id === 'send-view') { startScanner(); } if (id === 'receive-view') { document.getElementById('full-receive-address').textContent = state.wallet.address; generateQrCode(state.wallet.address, 'static-qr-code');
        } }
        function renderTransactionHistory() {
            const listUl = document.getElementById('transaction-list-ul');
            listUl.textContent = '';
            if (!state.userStore || !state.userStore.chain) return;

            const transactions = state.userStore.chain
                .filter(tx => (tx.type === 'send' || tx.type === 'receive' || tx.type === 'charge') && tx.status === 'completed')
                .slice(-10).reverse();
            if (transactions.length === 0) {
                const item = document.createElement('li');
                item.className = 'no-transactions';
                item.textContent = 'No transactions found.';
                listUl.appendChild(item);
                return;
            }

            transactions.forEach(tx => {
                const item = document.createElement('li');
                item.className = 'transaction-item';
                item.style.cursor = 'pointer';

                const isSent = tx.type === 'send';
                // =================================================================
                // ▼▼▼ THIS IS THE CORRECTED LINE ▼▼▼
                // =================================================================
                const typeText = isSent ? 'Sent' : (tx.comment || (tx.type === 'charge' ? 'Charge' : 'Received'));
                // =================================================================
                // ▲▲▲ END OF CORRECTION ▲▲▲
                // =================================================================
                const typeClass = isSent ? 'sent' : 'received';
                const totalAmount = tx.amount || 0;
                const date = new Date(tx.timestamp).toLocaleString('en-US');
                
                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'transaction-details';

                const typeSpan = document.createElement('span');
                typeSpan.className = `transaction-type ${typeClass}`;
                typeSpan.textContent = typeText;

                const dateSpan = document.createElement('span');
                dateSpan.className = 'transaction-date';
                dateSpan.textContent = date;

                detailsDiv.appendChild(typeSpan);
                detailsDiv.appendChild(dateSpan);

                const amountSpan = document.createElement('span');
                amountSpan.className = `transaction-amount ${typeClass}`;
                amountSpan.textContent = `${isSent ?
                '-' : '+'}$${totalAmount.toFixed(2)}`;

                item.appendChild(detailsDiv);
                item.appendChild(amountSpan);
                
                item.addEventListener('click', () => showTransactionDetails(tx));
                listUl.appendChild(item);
            });
        }
        function showTransactionDetails(tx) {
            const modal = document.getElementById('transaction-detail-modal');
            const confirmationData = tx.confirmation_data || tx;

            document.getElementById('detail-id').textContent = confirmationData.id || 'N/A';
            document.getElementById('detail-status').textContent = confirmationData.status || 'N/A';
            document.getElementById('detail-type').textContent = confirmationData.type || 'N/A';
            document.getElementById('detail-datetime').textContent = new Date(confirmationData.timestamp).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'medium' });
            document.getElementById('detail-amount').textContent = `$${(confirmationData.amount || 0).toFixed(2)}`;
            document.getElementById('detail-fee').textContent = `$${(confirmationData.fee || 0).toFixed(2)}`;
            document.getElementById('detail-from').textContent = confirmationData.from || 'N/A';
            document.getElementById('detail-to').textContent = confirmationData.to || 'N/A';
            document.getElementById('detail-comment').textContent = confirmationData.comment || 'N/A';

            const linkedHashEl = document.getElementById('detail-linked-hash');
            const localHashEl = document.getElementById('detail-local-hash');

            if (confirmationData.type === 'send' || (confirmationData.from === state.wallet.address && confirmationData.purpose !== 'fee')) {
                linkedHashEl.textContent = confirmationData.hash || 'N/A';
                document.getElementById('detail-local-hash').closest('p').style.display = 'none';
            } else {
                linkedHashEl.textContent = confirmationData.linkedTxHash || 'N/A';
                localHashEl.textContent = confirmationData.hash || 'N/A';
                document.getElementById('detail-local-hash').closest('p').style.display = 'block';
            }

            modal.style.display = 'flex';
            document.getElementById('close-modal-button').onclick = () => { modal.style.display = 'none'; };
            document.getElementById('download-tx-button').onclick = () => {
                const contentToCapture = document.getElementById('modal-details-content');
                html2canvas(contentToCapture, { scale: 2 }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `transaction_${(confirmationData.linkedTxHash || confirmationData.hash).substring(0, 10)}.jpg`;
                    link.href = canvas.toDataURL('image/jpeg', 0.9);
                    link.click();
                });
            };
        }
        
        async function initializeApp() {
            try {
                const fetchedConfig = await SupabaseLedger.getAppConfig();
                state.config = { ...AppConstants, ...fetchedConfig };
            } catch (e) {
                alert(`Critical error initializing app configuration: ${e.message}`);
                return;
            }
            if (localStorage.getItem('aura_user_store')) {
                showView('login-view');
            } else {
                showView('onboarding-view');
            }
            setupEventListeners();
        }
        
        function setupEventListeners() {
            document.getElementById('go-to-create-wallet').addEventListener('click', () => showView('create-wallet-view'));
            document.getElementById('go-to-restore-wallet').addEventListener('click', () => showView('restore-wallet-view'));
            document.getElementById('back-from-create').addEventListener('click', () => { resetViewInputs('create-wallet-view'); showView('onboarding-view'); });
            document.getElementById('back-from-restore').addEventListener('click', () => { resetViewInputs('restore-wallet-view'); showView('onboarding-view'); });
            document.getElementById('back-from-charge').addEventListener('click', () => showView('wallet-view'));
            document.getElementById('back-from-receive').addEventListener('click', () => showView('wallet-view'));
            document.getElementById('back-from-send').addEventListener('click', () => { resetViewInputs('send-view'); showView('wallet-view'); });
            document.getElementById('back-from-send-confirm').addEventListener('click', () => showView('send-view'));
            document.getElementById('back-from-qr-display').addEventListener('click', () => { showView('wallet-view'); });
            document.getElementById('create-wallet-button').addEventListener('click', async () => { const button = document.getElementById('create-wallet-button'), statusEl = document.getElementById('create-status'); const pass = document.getElementById('create-password-input').value.trim(), confirmPass = document.getElementById('confirm-password-input').value.trim(); statusEl.textContent = ''; if (pass.length < 8) { setStatus(statusEl, 'Password must be at least 8 characters.', 'error'); return; } if (pass !== confirmPass) { setStatus(statusEl, 'Passwords do not match.', 'error'); return; } button.disabled = true; setLoader('create-loader', true); setTimeout(() => { const { mnemonic } = WalletLogic.createWallet(pass); document.getElementById('seed-phrase-display').textContent = mnemonic; showView('seed-phrase-view'); button.disabled = false; setLoader('create-loader', false); }, 50); });
            document.getElementById('seed-phrase-confirm-button').addEventListener('click', async () => { await showView('wallet-view'); document.getElementById('seed-phrase-display').textContent = ''; resetViewInputs('create-wallet-view'); });
            document.getElementById('restore-wallet-button').addEventListener('click', async () => { const button = document.getElementById('restore-wallet-button'), statusEl = document.getElementById('restore-status'); const mnemonic = document.getElementById('restore-seed-input').value.trim(), pass = document.getElementById('restore-password-input').value.trim(); statusEl.textContent = ''; if (mnemonic.split(' ').length !== 12) { setStatus(statusEl, 'Recovery phrase must be 12 words.', 'error'); return; } if (pass.length < 8) { setStatus(statusEl, 'Password must be at least 8 characters.', 'error'); return; } button.disabled = true; setLoader('restore-loader', true); const success = await WalletLogic.restoreWallet(mnemonic, pass); if (success) { await showView('wallet-view'); } else { setStatus(statusEl, 'Restore failed. Invalid phrase.', 'error'); } button.disabled = false; setLoader('restore-loader', false); resetViewInputs('restore-wallet-view'); });
            document.getElementById('login-button').addEventListener('click', async () => { if (state.isLockedOut) return; const button = document.getElementById('login-button'), statusEl = document.getElementById('login-status'); const pass = document.getElementById('login-password-input').value.trim(); button.disabled = true; setLoader('login-loader', true); setStatus(statusEl, 'Decrypting wallet...', 'info'); const success = await WalletLogic.login(pass); if (success) { await showView('wallet-view'); resetViewInputs('login-view'); } else { if (state.failedLoginAttempts >= state.config.MAX_LOGIN_ATTEMPTS) { state.isLockedOut = true; setStatus(statusEl, 'Too many failed attempts. Please wait 30 seconds.', 'error'); setTimeout(() => { state.isLockedOut = false; state.failedLoginAttempts = 0; statusEl.textContent = ''; button.disabled = false; }, state.config.LOGIN_LOCKOUT_PERIOD); } else { setStatus(statusEl, `Invalid password. (${state.config.MAX_LOGIN_ATTEMPTS - state.failedLoginAttempts} attempts remaining)`, 'error');
            } } if (!state.isLockedOut) button.disabled = false; setLoader('login-loader', false); });
            document.getElementById('logout-button').addEventListener('click', () => { WalletLogic.logout(); showView('login-view'); });
            document.getElementById('reset-app-button').addEventListener('click', () => { if (confirm('Are you sure? All wallet data will be erased from this browser.')) { localStorage.removeItem('aura_user_store'); location.reload(); } });
            document.getElementById('copy-address-button').addEventListener('click', () => { const button = document.getElementById('copy-address-button'); navigator.clipboard.writeText(state.wallet.address).then(() => { button.textContent = 'Copied!'; setTimeout(() => { button.textContent = 'Copy'; }, 1500); }); });
            document.getElementById('show-receive-view-button').addEventListener('click', () => { resetViewInputs('receive-view'); showView('receive-view'); });
            document.getElementById('show-send-view-button').addEventListener('click', () => { resetViewInputs('send-view'); showView('send-view'); });
            document.getElementById('send-comment-input').addEventListener('input', (event) => {
                const count = event.target.value.length;
                document.getElementById('comment-char-count').textContent = `${count} / 50`;
            });
            document.getElementById('send-manual-button').addEventListener('click', async () => {
                const statusEl = document.getElementById('send-status');
                const recipientAddress = document.getElementById('send-address-input').value.trim();
                const amountStr = document.getElementById('send-amount-input').value;
                const amount = parseFloat(amountStr);
                const comment = document.getElementById('send-comment-input').value.trim();
                
                statusEl.textContent = '';
                
                if (comment.length > 50) {
                    setStatus(statusEl, 'Comment cannot exceed 50 characters.', 'error');
                    return;
                }
                if (!ethers.isAddress(recipientAddress)) { setStatus(statusEl, 'Invalid recipient address.', 'error'); return; }
                if (isNaN(amount) || amount <= 0) { setStatus(statusEl, 'Please enter a valid amount.', 'error'); return; }

                const precision = state.config.PRECISION; const amountBI = ethers.parseUnits(amountStr, precision); const feeBI = (amountBI * BigInt(Math.round(state.config.FEE_PERCENTAGE * 1000))) / 1000n; const totalBI = amountBI + feeBI;
                if (state.currentBalance < totalBI) { setStatus(statusEl, 'Insufficient funds.', 'error'); return; }
                
                state.activeManualSend = { address: recipientAddress, amount: amount, comment: comment };
                state.activePaymentRequest = null;

                const feeNum = parseFloat(ethers.formatUnits(feeBI, precision));
                const totalNum = parseFloat(ethers.formatUnits(totalBI, precision));
                
                document.getElementById('confirm-amount-display').innerHTML = sanitizeHTML(`Amount: $${sanitizeHTML(amount.toFixed(2))}<br><span style="font-size: 14px; color: #555;">Fee (${(state.config.FEE_PERCENTAGE*100).toFixed(1)}%): +$${sanitizeHTML(feeNum.toFixed(2))}</span><br><strong style="font-size: 18px;">Total: $${sanitizeHTML(totalNum.toFixed(2))}</strong>`);
                document.getElementById('confirm-recipient-address-display').textContent = recipientAddress;
                document.getElementById('confirm-comment-display').textContent = comment ? `Comment: "${sanitizeHTML(comment)}"` : '';
                await showView('send-confirm-view');
            });
            document.getElementById('search-tx-id-button').addEventListener('click', async () => { const searchButton = document.getElementById('search-tx-id-button'); const searchInput = document.getElementById('search-tx-id-input'); const searchId = searchInput.value.trim(); if (!searchId) { renderTransactionHistory(); return; } const localTransaction = state.userStore.chain.find(tx => tx.id && tx.id.toString() === searchId); if (localTransaction) { showTransactionDetails(localTransaction); return; } searchButton.disabled = true; searchButton.textContent = '...'; try { const serverTransaction = await SupabaseLedger.findTransactionById(searchId); if (serverTransaction) { const displayableTx = { id: serverTransaction.id, status: 'completed', type: serverTransaction.senderAddress === 'BANKNOTE_ISSUER' ? 'charge' : (serverTransaction.senderAddress === state.wallet.address ? 'send' : 'receive'), timestamp: serverTransaction.timestamp, amount: serverTransaction.amount, fee: 0, from: serverTransaction.senderAddress, to: serverTransaction.receiverAddress, hash: serverTransaction.hash, linkedTxHash: serverTransaction.linkedTxHash, comment: serverTransaction.comment }; showTransactionDetails(displayableTx); } else { alert('Transaction not found on the server.'); } } catch (error) { console.error("Server search failed:", error); alert(`Error searching server: ${error.message}`); } finally { searchButton.disabled = false; searchButton.textContent = 'Search'; } });
            document.getElementById('create-request-qr-button').addEventListener('click', () => { const amount = parseFloat(document.getElementById('request-amount-input').value); const statusEl = document.getElementById('receive-status'); if (isNaN(amount) || amount <= 0) { setStatus(statusEl, 'Please enter a valid amount.', 'error'); return; } const request = WalletLogic.createPaymentRequest(amount); document.getElementById('qr-display-title').textContent = 'Payment Request'; document.getElementById('qr-display-instruction').textContent = `Show this QR to the sender to pay $${amount.toFixed(2)}.`; document.getElementById('qr-display-box').style.display = 'block'; generateQrCode(JSON.stringify(request), 'qr-display-box'); document.getElementById('waiting-on-payment').style.display = 'block'; const statusMsg = document.getElementById('final-status-message'), timerEl = document.getElementById('payment-timer'); setStatus(statusMsg, 'Waiting for sender to pay...', 'info'); document.querySelector('#waiting-on-payment .loader').style.display = 'block';
            showView('qr-display-view'); let timeLeft = state.config.PAYMENT_REQUEST_EXPIRY; const updateTimer = () => { timeLeft -= 1000;
            const minutes = Math.floor(timeLeft / 60000), seconds = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0'); timerEl.textContent = `Expires in: ${minutes}:${seconds}`;
            if (timeLeft <= 0) { clearInterval(state.activePollingTimer); state.activePollingTimer = null; setStatus(statusMsg, 'Payment request expired.', 'error'); document.querySelector('#waiting-on-payment .loader').style.display = 'none'; } };
            updateTimer(); state.activePollingTimer = setInterval(async () => { updateTimer(); if (timeLeft <= 0) return; try { const confirmation = await SupabaseLedger.findConfirmation(request.linkedTxHash); if (confirmation) { clearInterval(state.activePollingTimer); state.activePollingTimer = null; timerEl.style.display = 'none'; setStatus(statusMsg, 'Payment detected! Finalizing...', 'info'); if (await WalletLogic.finalizePayment(confirmation)) { setStatus(statusMsg, `Success! $${Number(confirmation.amount).toFixed(2)} received.`, 'success'); document.querySelector('#waiting-on-payment .loader').style.display = 'none'; setTimeout(async () => { await showView('wallet-view'); }, 2000); } } } catch (err) { console.error("Polling error:", err); setStatus(statusMsg, 'Network error while checking for payment.', 'error'); clearInterval(state.activePollingTimer); state.activePollingTimer = null; } }, state.config.POLLING_INTERVAL);
            });
            document.getElementById('confirm-payment-button').addEventListener('click', async (event) => { const button = event.target, statusEl = document.getElementById('send-confirm-status'); button.disabled = true; setStatus(statusEl, 'Processing payment...', 'info'); try { await WalletLogic.getServerAuthoritativeBalance(); let success = false, message = ''; if (state.activePaymentRequest) { await WalletLogic.processPayment(state.activePaymentRequest); message = `Payment of $${state.activePaymentRequest.amount.toFixed(2)} sent!`; success = true; } else if (state.activeManualSend) {
                await WalletLogic.directSend(state.activeManualSend.address, state.activeManualSend.amount, state.activeManualSend.comment);
                message = `Payment of $${state.activeManualSend.amount.toFixed(2)} sent!`; success = true; } else { throw new Error("No active payment request."); } if (success) { setStatus(statusEl, message, 'success'); await BackgroundSync.performSync(); await new Promise(resolve => setTimeout(resolve, 1500)); state.activePaymentRequest = null;
            state.activeManualSend = null; await showView('wallet-view'); } } catch (err) { setStatus(statusEl, `Payment Failed: ${err.message}`, 'error');
            } finally { button.disabled = false; } });
            document.getElementById('show-charge-view-button').addEventListener('click', () => { resetViewInputs('charge-view'); document.getElementById('charge-confirmation').style.display = 'none'; const confirmBtn = document.getElementById('confirm-charge-button'); confirmBtn.disabled = true; confirmBtn.removeAttribute('data-amount'); confirmBtn.removeAttribute('data-serial'); showView('charge-view'); });
            document.getElementById('confirm-charge-button').addEventListener('click', async (event) => { const button = event.target; button.disabled = true; const statusEl = document.getElementById('validation-status'); statusEl.textContent = ''; const amount = parseFloat(button.dataset.amount); const serial = button.dataset.serial; if (isNaN(amount) || !serial) { alert("An internal error occurred. Please try again."); await showView('wallet-view'); return; } try { setStatus(statusEl, 'Recording banknote on public ledger...', 'info'); await SupabaseLedger.recordSpentIdentifier(serial, 'banknote'); setStatus(statusEl, 'Creating public transaction record...', 'info'); const chargeConfirmation = { type: 'AURA_PAYMENT_CONFIRMATION', senderAddress: 'BANKNOTE_ISSUER', receiverAddress: state.wallet.address, amount: amount, linkedTxHash: 'charge-' + serial }; await SupabaseLedger.pinConfirmation(chargeConfirmation); WalletLogic.addToChain({ type: 'charge', amount: amount, from: 'BANKNOTE_ISSUER', to: state.wallet.address, serial: serial, status: 'completed', linkedTxHash: 'charge-' + serial });
            CacheManager.invalidate(state.wallet.address); await BackgroundSync.performSync(); alert(`$${amount.toFixed(2)} added to your balance successfully.`); await showView('wallet-view'); } catch (err) { console.error("Charge confirmation failed:", err);
            setStatus(statusEl, `Charge Failed: ${err.message}`, 'error'); button.disabled = false; } });
            document.getElementById('banknote-image-input').addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                const statusEl = document.getElementById('validation-status');
                const confirmSection = document.getElementById('charge-confirmation');
     
                           const confirmBtn = document.getElementById('confirm-charge-button');

                confirmSection.style.display = 'none';
                confirmBtn.disabled = true;
                setStatus(statusEl, 'Preparing image...', 'info');

                let banknotePayload;
              
                 let parsedInfo = {};

                try {
                    // Step 1: Decode the QR grid from the image
                    const resizedDataUrl = await CoreLogic.Utils.resizeImage(file, CoreLogic.Constants.MAX_IMAGE_DIMENSION);
                    const processedDataUrl = await 
                    CoreLogic.Utils.preprocessImage(resizedDataUrl);
                    const imageData = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            const c = document.createElement('canvas');
    
                                         c.width = img.width; c.height = img.height;
                            const ctx = c.getContext('2d');
                            ctx.drawImage(img, 0, 0);
          
                                     resolve(ctx.getImageData(0, 0, img.width, img.height));
                        };
                        img.onerror = reject;
                        img.src = processedDataUrl;
   
                                   });
                    banknotePayload = await CoreLogic.Banknote.decodeQrGrid(imageData, statusEl);

                    // Step 2: Extract key info before validation attempt
                    const decompressed = pako.inflate(new Uint8Array(atob(banknotePayload).split('').map(c => c.charCodeAt(0))));
                    const jsonString = new TextDecoder('utf-8').decode(decompressed);
                    const parsedPayload = JSON.parse(jsonString);
                    parsedInfo = { amount: parsedPayload.a, serial: parsedPayload.s };
                    // Step 3: Attempt validation with the server
                    setStatus(statusEl, 'Scan complete. Contacting server for validation...', 'info');
                    const validationResult = await SupabaseLedger.validateBanknote(banknotePayload);

                    if (validationResult.success) {
                        // SUCCESS CASE: Banknote is valid and unspent
                        setStatus(statusEl, 'Banknote is valid! This is an original, unredeemed note.', 'success');
                        document.getElementById('validated-amount').textContent = `$${validationResult.amount.toFixed(2)}`;
                        confirmBtn.dataset.amount = validationResult.amount;
                        confirmBtn.dataset.serial = validationResult.serial;
                        confirmBtn.disabled = false;
                        confirmSection.style.display = 'block';
                    } else {
                        throw new Error("Server rejected the banknote for an unknown reason.");
                    }

                } catch (err) {
                    // UPGRADED ERROR HANDLING: This is the "Proof of Provenance" feature
                    if (err.message.includes('already been spent') && parsedInfo.serial) {
                        setStatus(statusEl, 
                        'This banknote has a history. Fetching details...', 'info');
                        try {
                            const details = await SupabaseLedger.getSpendDetails(parsedInfo.serial);
                            const redeemDate = new Date(details.redeemedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'medium' });
                            // Display the "Certificate of Provenance" instead of an error
                            statusEl.className = 'status-box';
                            // Reset class
                            statusEl.innerHTML = sanitizeHTML(`
                                <div style="text-align: left; padding: 15px; border: 1px solid #ccc; border-radius: 8px; background-color: #f9f9f9;">
                        
                                     <h4 style="text-align: center; margin-top: 0;">Banknote Certificate</h4>
                                    <p><strong>Serial:</strong> ${sanitizeHTML(parsedInfo.serial)}</p>
                                    <p><strong>Amount:</strong> $${sanitizeHTML(parsedInfo.amount.toFixed(2))}</p>
         
                                                               <hr>
                                    <p style="color: #d9534f;"><strong>Status:</strong> Redeemed</p>
                                  
                                     <p><strong>Redeemed By:</strong> ${details.redeemedBy ? sanitizeHTML(details.redeemedBy) : 'N/A'}</p>
                                    <p><strong>Redeemed On:</strong> ${sanitizeHTML(redeemDate)}</p>
                                </div>
                      
                     `);
                        } catch (detailsError) {
                            setStatus(statusEl, `Validation Failed: This banknote was already spent, but its history could not be retrieved.`, 'error');
                        }
                    } else {
                        // Standard error for any other issue
                        setStatus(statusEl, `Validation Failed: ${err.message}`, 'error');
                    }
                } finally {
                    event.target.value = '';
                    // Clear the file input
                }
            });
        }
        document.addEventListener('DOMContentLoaded', initializeApp);
    