const { initializeContract } = require('../contracts/scripts/helpers.js');
const { expect } = require('chai');

const INITIAL_SUPPLY = 1000;
const DECIMALS = 10 ** 18;

const createTestSuite = ({ contract, constructorArgs }) =>
  function () {
    context(`${contract}`, function () {
      beforeEach(async function () {
        this.treasurePoints = await initializeContract(contract, constructorArgs);
      });

      context('Initial Contract', async function () {
        beforeEach(async function () {
          const [owner, addr1] = await ethers.getSigners();
          this.owner = owner;
          this.addr1 = addr1;
        });

        it('has correct name and symbol', async function () {
          const name = await this.treasurePoints.name();
          expect(name).to.equal('Treasure Points');

          const symbol = await this.treasurePoints.symbol();
          expect(symbol).to.equal('TP');
        });

        it('has initial supply of 1000', async function () {
          const supply = await this.treasurePoints.totalSupply();
          expect(supply / 10 ** 18).to.equal(INITIAL_SUPPLY);
        });
      });

      context('Minting', async function () {
        beforeEach(async function () {
          const [owner, addr1] = await ethers.getSigners();
          this.owner = owner;
          this.addr1 = addr1;
        });

        it('owner is allowed to mint', async function () {
          const mintAmount = 500;
          await this.treasurePoints.mint(this.addr1.address, (mintAmount * DECIMALS).toString());
          const supply = await this.treasurePoints.totalSupply();
          expect(supply / DECIMALS).to.equal(INITIAL_SUPPLY + mintAmount);

          const balanceAddr1 = await this.treasurePoints.balanceOf(this.addr1.address);
          expect(balanceAddr1 / DECIMALS).to.equal(mintAmount);
        });

        it('random cannot mint', async function () {
          const mintAmount = 500;

          const addr1 = this.treasurePoints.connect(this.addr1);
          await expect(addr1.mint(mintAmount)).to.be.reverted;
        });
      });

      context('Grant Role', async function () {
        beforeEach(async function () {
          const [owner, addr1] = await ethers.getSigners();
          this.owner = owner;
          this.addr1 = addr1;
        });

        it('owner can grant minter role', async function () {
          const mintAmount = 500;

          await this.treasurePoints.grantMinterRole(this.addr1.address);

          const addr1 = this.treasurePoints.connect(this.addr1);
          expect(addr1.mint(mintAmount)).to.ok;
        });

        it('owner cannot revoke own minter role', async function () {
          await expect(this.treasurePoints.revokeMinterRole(this.owner.address)).to.be.revertedWith(
            'Cannot Revoke own Role'
          );
        });
      });
    });
  };

describe('TreasurePoints', createTestSuite({ contract: 'TreasurePoints', constructorArgs: [INITIAL_SUPPLY] }));
