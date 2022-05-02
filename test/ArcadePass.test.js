const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { deployContract } = require('../contracts/scripts/helpers.js');
const { expect } = require('chai');
const { ethers } = require('hardhat');

const START_TIME = 1649083667;

const createTestSuite = ({ contract, constructorArgs }) =>
  function () {
    context(`${contract}`, function () {
      beforeEach(async function () {
        this.arcadePass = await deployContract(contract, constructorArgs);
      });

      context('Initial Contract', async function () {
        beforeEach(async function () {
          const accounts = await ethers.getSigners();
          this.owner = accounts[0];
          this.addr1 = accounts[1];
          this.addr2 = accounts[2];
        });

        it('has 0 totalSupply', async function () {
          const supply = await this.arcadePass.totalSupply();
          expect(supply).to.equal(0);
        });

        it('has 0 totalMinted', async function () {
          const totalMinted = await this.arcadePass.totalMinted();
          expect(totalMinted).to.equal(0);
        });

        it('owner can update mint start times', async function () {
          await this.arcadePass.updatePublicMintStartTime(START_TIME);
          await this.arcadePass.updateAllowlistMintStartTime(START_TIME + 1000);

          const publicMintStartTime = await this.arcadePass.publicMintStartTime();
          expect(publicMintStartTime).to.equal(START_TIME);

          const allowlistMintStartTime = await this.arcadePass.allowlistMintStartTime();
          expect(allowlistMintStartTime).to.equal(START_TIME + 1000);
        });
      });

      context('Team Mint Functionality', async function () {
        beforeEach(async function () {
          const [owner, addr1] = await ethers.getSigners();
          this.owner = owner;
          this.addr1 = addr1;
        });

        it('team can mint tokens', async function () {
          const teamAllowance = await this.arcadePass.TEAM_MINT_COUNT();

          await this.arcadePass.teamMint();

          const teamAddress = await this.arcadePass.teamAddress();
          const teamBalance = await this.arcadePass.balanceOf(teamAddress);
          expect(teamBalance).to.be.equal(teamAllowance);
        });

        it('only the teamAddress can mint', async function () {
          await expect(this.arcadePass.connect(this.addr1).teamMint()).to.be.revertedWith(
            'Caller is not the teamAddress'
          );
        });
      });

      context('Public Mint Functionality', async function () {
        beforeEach(async function () {
          const accounts = await ethers.getSigners();
          this.owner = accounts[0];
          this.addr1 = accounts[1];
          this.addr2 = accounts[2];

          this.price = await this.arcadePass.ETH_PRICE();
          this.maxMintCount = await this.arcadePass.MAX_MINT_COUNT();
        });

        it('throws an exception if minted before publicMintStartTime', async function () {
          const startTime = Date.now() + 1000000;
          await this.arcadePass.updatePublicMintStartTime(startTime);
          await expect(this.arcadePass.publicMint()).to.be.revertedWith('Not Active');
        });

        it('can mint MAX_MINT_COUNT tokens', async function () {
          const addr1 = this.arcadePass.connect(this.addr1);
          const price = this.price * this.maxMintCount;

          await addr1.publicMint({ value: price.toString() });
          const balance = await addr1.balanceOf(this.addr1.address);
          expect(+balance).to.be.equal(this.maxMintCount);
        });

        it('throws an exception if underpaid', async function () {
          const addr1 = this.arcadePass.connect(this.addr1);

          await expect(addr1.publicMint({ value: ethers.utils.parseEther('0.10') })).to.be.revertedWith(
            'Incorrect ETH value Sent'
          );
        });
      });

      context('Allowlist Mint Functionality', async function () {
        beforeEach(async function () {
          const accounts = await ethers.getSigners();
          this.owner = accounts[0];
          this.addr1 = accounts[1];
          this.addr2 = accounts[2];

          const leafNodes = [this.owner.address, this.addr1.address].map((addr) => keccak256(addr));
          const tree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
          this.merkleTree = tree;

          const root = '0x' + this.merkleTree.getRoot().toString('hex');
          await this.arcadePass.updateMerkleRoot(root);

          this.price = await this.arcadePass.ETH_PRICE();
        });

        it('throws an exception if minted before allowlistMintStartTime', async function () {
          const proof = this.merkleTree.getHexProof(keccak256(this.owner.address));
          const startTime = Date.now() + 1000000;
          await this.arcadePass.updateAllowlistMintStartTime(startTime);
          await expect(this.arcadePass.allowlistMint(proof, { value: this.price.toString() })).to.be.revertedWith(
            'Not Active'
          );
        });

        it('throws an exception if address is not eligible to mint', async function () {
          const proof = this.merkleTree.getHexProof(keccak256(this.addr2.address));
          const addr2 = this.arcadePass.connect(this.addr2);
          await expect(addr2.allowlistMint(proof, { value: this.price.toString() })).to.be.revertedWith(
            'Invalid Proof'
          );
        });

        it('throws an exception if underpaid', async function () {
          const proof = this.merkleTree.getHexProof(keccak256(this.addr1.address));
          const addr1 = this.arcadePass.connect(this.addr1);

          await expect(addr1.allowlistMint(proof, { value: ethers.utils.parseEther('0.01') })).to.be.revertedWith(
            'Incorrect ETH value Sent'
          );
        });

        it('mints when on the allowlist', async function () {
          const proof = this.merkleTree.getHexProof(keccak256(this.addr1.address));
          const addr1 = this.arcadePass.connect(this.addr1);

          await addr1.allowlistMint(proof, { value: this.price.toString() });
          let balance = await addr1.balanceOf(this.addr1.address);
          expect(+balance).to.be.equal(1);

          await expect(addr1.allowlistMint(proof, { value: this.price.toString() })).to.be.revertedWith(
            'Not Eligible to Mint'
          );
        });
      });
    });
  };

describe(
  'ArcadePass',
  createTestSuite({
    contract: 'ArcadePass',
    constructorArgs: [
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      '0x070e8db97b197cc0e4a1790c5e6c3667bab32d733db7f815fbe84f5824c7168d',
      1651498961,
      1651498961,
    ],
  })
);
