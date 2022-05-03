const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { deployContract } = require('../contracts/scripts/helpers.js');
const { expect } = require('chai');
const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');

const START_TIME = 1649083667;
const URI = 'http://test-uri.abc/';
let mainContract;
let price;
let maxMintCount;
let owner;
let team;
let addr1;
let addr2;

const createTestSuite = ({ contract, constructorArgs }) =>
  function () {
    context(`${contract}`, function () {
      beforeEach(async function () {
        mainContract = await deployContract(contract, constructorArgs);
        price = await mainContract.ETH_PRICE();
        maxMintCount = await mainContract.MAX_MINT_COUNT();

        const [ownerWallet, addr1Wallet, addr2Wallet, teamWallet] = await ethers.getSigners();
        owner = ownerWallet;
        addr1 = addr1Wallet;
        addr2 = addr2Wallet;
        team = teamWallet;

        await mainContract.updateTeamAddress(team.address);
      });

      context('Initial Contract', async function () {
        it('has name and symbol set', async function () {
          const name = await mainContract.name();
          expect(name).to.equal('Arcade Pass');

          const symbol = await mainContract.symbol();
          expect(symbol).to.equal('ARCADE');
        });

        it('has minted genesis nft', async function () {
          const totalMinted = await mainContract.totalMinted();
          expect(totalMinted).to.equal(1);

          const owner = await mainContract.owner();
          expect(await mainContract.balanceOf(owner, 1)).to.equal(1);
        });

        it('owner can update mint start times', async function () {
          await mainContract.updatePublicMintStartTime(START_TIME);
          await mainContract.updateAllowlistMintStartTime(START_TIME + 1000);

          const publicMintStartTime = await mainContract.publicMintStartTime();
          expect(publicMintStartTime).to.equal(START_TIME);

          const allowlistMintStartTime = await mainContract.allowlistMintStartTime();
          expect(allowlistMintStartTime).to.equal(START_TIME + 1000);
        });

        it('has uri set', async function () {
          const uri = await mainContract.uri(1);
          expect(uri).to.equal(URI);
        });

        it('can be paused and unpaused', async function () {
          let isPaused = await mainContract.paused();
          expect(isPaused).to.equal(false);

          await mainContract.pause();

          isPaused = await mainContract.paused();
          expect(isPaused).to.equal(true);

          await expect(mainContract.publicMint(1, { value: price })).to.be.revertedWith('Pausable: paused');

          await mainContract.unpause();

          isPaused = await mainContract.paused();
          expect(isPaused).to.equal(false);
        });
      });

      context('Team Mint Functionality', async function () {
        it('team can mint tokens', async function () {
          const initialSupply = BigNumber.from(await mainContract.totalMinted());
          const teamAllowance = BigNumber.from(await mainContract.TEAM_MINT_COUNT());

          const teamWallet = mainContract.connect(team);
          await teamWallet.teamMint();

          const currentSupply = BigNumber.from(await mainContract.totalMinted());
          expect(currentSupply).to.be.equal(initialSupply.add(teamAllowance));
        });

        it('only the teamAddress can mint', async function () {
          await expect(mainContract.connect(addr1).teamMint()).to.be.revertedWith('Caller is not the teamAddress');
        });

        it('teamAddress can withdrawBalance', async function () {
          const provider = waffle.provider;
          let contractBalance = await provider.getBalance(mainContract.address);
          const initialTeamBalance = BigNumber.from(await provider.getBalance(team.address));
          expect(contractBalance).to.be.equal(BigNumber.from(0));

          const user = mainContract.connect(addr1);
          expect(await user.publicMint(1, { value: price.toString() })).to.be.ok;

          contractBalance = await provider.getBalance(mainContract.address);
          expect(contractBalance).to.be.equal(BigNumber.from(price));

          const teamWallet = mainContract.connect(team);
          await teamWallet.withdrawBalance();

          contractBalance = await provider.getBalance(mainContract.address);
          expect(contractBalance).to.be.equal(BigNumber.from(0));

          const teamBalance = await provider.getBalance(team.address);
          expect(Number(teamBalance)).to.be.approximately(
            Number(initialTeamBalance.add(BigNumber.from(price))),
            1 * 10 ** 15
          );
        });
      });

      context('Public Mint Functionality', async function () {
        it('throws an exception if minted before publicMintStartTime', async function () {
          const startTime = Date.now() + 1000000;
          await mainContract.updatePublicMintStartTime(startTime);
          await expect(mainContract.publicMint(1, { value: price })).to.be.revertedWith('Not Active');
        });

        it('can mint MAX_MINT_COUNT tokens', async function () {
          const user = mainContract.connect(addr1);
          const totalPrice = price * maxMintCount;

          expect(user.publicMint(maxMintCount, { value: totalPrice.toString() })).to.be.ok;
        });

        it('throws an exception if underpaid', async function () {
          const user = mainContract.connect(addr1);

          await expect(user.publicMint(1, { value: ethers.utils.parseEther('0.01') })).to.be.revertedWith(
            'Incorrect ETH value Sent'
          );
        });
      });

      context('Allowlist Mint Functionality', async function () {
        beforeEach(async function () {
          const leafNodes = [owner.address, addr1.address].map((addr) => keccak256(addr));
          const tree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
          this.merkleTree = tree;

          const root = '0x' + this.merkleTree.getRoot().toString('hex');
          await mainContract.updateMerkleRoot(root);
        });

        it('throws an exception if minted before allowlistMintStartTime', async function () {
          const proof = this.merkleTree.getHexProof(keccak256(owner.address));
          const startTime = Date.now() + 1000000;
          await mainContract.updateAllowlistMintStartTime(startTime);
          await expect(mainContract.allowlistMint(proof, 1, { value: price.toString() })).to.be.revertedWith(
            'Not Active'
          );
        });

        it('throws an exception if address is not eligible to mint', async function () {
          const proof = this.merkleTree.getHexProof(keccak256(addr2.address));
          const user = mainContract.connect(addr2);
          await expect(user.allowlistMint(proof, 1, { value: price.toString() })).to.be.revertedWith('Invalid Proof');
        });

        it('throws an exception if underpaid', async function () {
          const proof = this.merkleTree.getHexProof(keccak256(addr1.address));
          const user = mainContract.connect(addr1);

          await expect(user.allowlistMint(proof, 1, { value: ethers.utils.parseEther('0.01') })).to.be.revertedWith(
            'Incorrect ETH value Sent'
          );
        });

        it('mints when on the allowlist', async function () {
          const proof = this.merkleTree.getHexProof(keccak256(addr1.address));
          const user = mainContract.connect(addr1);

          const totalPrice = price * maxMintCount;

          expect(user.allowlistMint(proof, maxMintCount, { value: totalPrice.toString() })).to.be.ok;
          await expect(user.allowlistMint(proof, 1, { value: price.toString() })).to.be.revertedWith(
            'Exceeds allowance'
          );
        });
      });
    });
  };

describe(
  'ArcadePass1155',
  createTestSuite({
    contract: 'ArcadePass1155',
    constructorArgs: [
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      '0x070e8db97b197cc0e4a1790c5e6c3667bab32d733db7f815fbe84f5824c7168d',
      START_TIME,
      START_TIME,
      URI,
    ],
  })
);
