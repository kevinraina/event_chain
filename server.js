const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ethers } = require('hardhat');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Expose minimal config to the frontend (WalletConnect project id, etc.)
app.get('/api/config', (req, res) => {
  try {
    const secretPath = path.join(__dirname, '.secret.json');
    let wcProjectId = '';
    if (fs.existsSync(secretPath)) {
      const raw = JSON.parse(fs.readFileSync(secretPath, 'utf-8'));
      // Allow both keys: wcProjectId (preferred) or projectId (fallback)
      wcProjectId = raw.wcProjectId || raw.projectId || '';
    }
    res.json({ ok: true, wcProjectId });
  } catch (e) {
    res.status(200).json({ ok: false, wcProjectId: '' });
  }
});

function loadDeployment() {
  const p = path.join(__dirname, 'deployment', 'deployment.json');
  if (!fs.existsSync(p)) {
    throw new Error('deployment/deployment.json not found. Deploy first.');
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function getContracts() {
  const deployment = loadDeployment();
  const eventChain = await ethers.getContractAt(
    'EventChainContract',
    deployment.contracts.EventChainContract
  );
  const manager = await ethers.getContractAt(
    'EventChainEventManagerContract',
    deployment.contracts.EventChainEventManagerContract
  );
  const [signer] = await ethers.getSigners();
  return { eventChain, manager, signer, deployment };
}

app.post('/api/events', async (req, res) => {
  try {
    const { name, location, date, ticketPriceEth } = req.body;
    if (!name || !location || !date) return res.status(400).json({ ok: false, error: 'Missing fields' });
    const priceNum = Number(ticketPriceEth);
    if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ ok: false, error: 'Invalid price' });
    const priceWei = ethers.parseEther(String(priceNum));
    const { manager } = await getContracts();
    const tx = await manager.createEvent(name, location, date, priceWei);
    await tx.wait();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { eventId, to, uri } = req.body;
    const idNum = Number(eventId);
    if (!Number.isInteger(idNum) || idNum < 0) return res.status(400).json({ ok: false, error: 'Invalid eventId' });
    if (!to || !to.startsWith('0x') || to.length !== 42) return res.status(400).json({ ok: false, error: 'Invalid recipient address' });
    if (!uri) return res.status(400).json({ ok: false, error: 'Missing uri' });
    const { manager } = await getContracts();
    const tx = await manager.mintTicket(idNum, to, uri);
    const receipt = await tx.wait();
    // tokenId is emitted by EventChainContract TicketMinted(tokenId,...)
    const mintLog = receipt.logs.find(l => l.fragment && l.fragment.name === 'TicketMinted');
    const tokenId = mintLog ? Number(mintLog.args[0]) : 0;

    const payload = {
      contract: (await getContracts()).deployment.contracts.EventChainContract,
      tokenId
    };
    const qr = await QRCode.toDataURL(JSON.stringify(payload));
    res.json({ ok: true, tokenId, qr });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/tickets/:id/status', async (req, res) => {
  try {
    const tokenId = Number(req.params.id);
    if (!Number.isInteger(tokenId) || tokenId < 0) return res.status(400).json({ ok: false, error: 'Invalid tokenId' });
    const { eventChain } = await getContracts();
    const status = await eventChain.getTicketStatus(tokenId);
    res.json({ ok: true, isUsed: status.isUsed, isValid: status.isValid });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/tickets/:id/validate', async (req, res) => {
  try {
    const tokenId = Number(req.params.id);
    if (!Number.isInteger(tokenId) || tokenId < 0) return res.status(400).json({ ok: false, error: 'Invalid tokenId' });
    const { eventChain } = await getContracts();
    const tx = await eventChain.validateTicket(tokenId);
    await tx.wait();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server at http://localhost:${PORT}`);
});


