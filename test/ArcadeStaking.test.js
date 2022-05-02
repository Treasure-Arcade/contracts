const { deployContract, initializeContract } = require('../contracts/scripts/helpers.js');
const { expect } = require('chai');
const { ethers } = require('hardhat');

const INITIAL_SUPPLY = 1000;
const DECIMALS = 10 ** 18;

const createTestSuite = ({ contract }) =>
  function () {
    context(`${contract}`, function () {
      beforeEach(async function () {
        this.arcadePass = await deployContract('ArcadePass', [
          '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          '0x070e8db97b197cc0e4a1790c5e6c3667bab32d733db7f815fbe84f5824c7168d',
          1651498961,
          1651498961,
        ]);
        this.treasurePoints = await initializeContract('TreasurePoints', [INITIAL_SUPPLY]);
        this.arcadeStaking = await initializeContract(contract, [this.arcadePass.address, this.treasurePoints.address]);

        await this.treasurePoints.grantMinterRole(this.arcadeStaking.address);
        await this.arcadePass.teamMint();
        await this.arcadeStaking.unpause();
      });

      context('Initial Contract', async function () {
        beforeEach(async function () {
          const [owner] = await ethers.getSigners();
          this.owner = owner;

          await this.arcadePass.setApprovalForAll(this.arcadeStaking.address, true);
        });

        it('can call treasurePoints contract', async function () {
          const supply = await this.treasurePoints.totalSupply();
          expect(supply / DECIMALS).to.equal(INITIAL_SUPPLY);
        });

        it('has initial emissionRate', async function () {
          const emissionRate = await this.arcadeStaking.emissionRate();
          expect(emissionRate / DECIMALS).to.equal(0.055);
        });
      });

      context('Deposit Arcade Pass', async function () {
        beforeEach(async function () {
          const [owner] = await ethers.getSigners();
          this.owner = owner;
        });

        it('can deposit multiple arcade passes and accrue staking rewards', async function () {
          const emissionRate = await this.arcadeStaking.emissionRate();
          await this.arcadePass.setApprovalForAll(this.arcadeStaking.address, true);

          // Deposit Arcade Passes with tokenId 0 and 8
          expect(await this.arcadeStaking.deposit([0, 8])).to.ok;
          expect(await this.arcadePass.ownerOf(0)).to.equal(this.arcadeStaking.address);

          await this.arcadeStaking.claimRewards([0, 8]);
          expect(
            (await this.treasurePoints.balanceOf(this.owner.address)) - INITIAL_SUPPLY * DECIMALS
          ).to.be.approximately(2 * emissionRate, 1 * 10 ** 5);
        });
      });

      context('Withdraw Arcade Pass', async function () {
        beforeEach(async function () {
          const [owner] = await ethers.getSigners();
          this.owner = owner;
        });

        it('can withdraw Arcade Pass and also receive rewards', async function () {
          const emissionRate = await this.arcadeStaking.emissionRate();
          await this.arcadePass.setApprovalForAll(this.arcadeStaking.address, true);
          await this.arcadeStaking.deposit([0]);

          expect(await this.arcadeStaking.withdraw([0])).to.be.ok;
          expect(
            (await this.treasurePoints.balanceOf(this.owner.address)) - INITIAL_SUPPLY * DECIMALS
          ).to.be.approximately(1 * emissionRate, 1 * 10 ** 5);

          expect(await this.arcadePass.ownerOf(0)).to.equal(this.owner.address);
        });
      });
    });
  };

describe('ArcadeStaking', createTestSuite({ contract: 'ArcadeStaking' }));
