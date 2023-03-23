import { expect } from 'chai';
import { ethers } from 'hardhat';
import { CreditOracle, FakeOperator, FakeToken, LinkToken, Xscrow } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Xscrow', () => {
  let xscrow: Xscrow;
  let owner: SignerWithAddress;
  let wallet1: SignerWithAddress;
  let wallet2: SignerWithAddress;
  let lenderTreasury: SignerWithAddress;
  let vendorTreasury: SignerWithAddress;
  let oracle: CreditOracle;
  let fakeLinkToken: LinkToken;
  let fakeToken: FakeToken;
  let fakeOperator: FakeOperator;
  let jobId: Uint8Array;

  const testAmount = 1000000;
  const testFee = 2;
  const testFeeAmount = testAmount * (testFee / 100);
  const anApiUrl = 'https://anurl.com';
  const pausableRejectedMsg = 'Pausable: paused';
  const ownableRejectedMsg = 'Ownable: caller is not the owner';
  const oracleRejectedMsg = 'Caller is not the oracle';
  const nonZeroAmountRejectedMsg = 'Deposit: amount must be > 0';
  const testIdentifier = 'token_xscrow';
  const _withdraw = async (oracleReturnData: boolean) => {
    await fakeToken.mint(wallet1.address, testAmount);
    await fakeToken.connect(wallet1).approve(xscrow.address, testAmount);
    await xscrow.connect(wallet1).deposit(testAmount);

    const transaction = await xscrow.connect(wallet1).requestWithdraw();
    const transactionReceipt = await transaction.wait(1);
    const requestId = transactionReceipt.events![0].topics[1];
    await fakeOperator.fulfillOracleRequest(
      requestId,
      ethers.utils.defaultAbiCoder.encode(['bool'], [oracleReturnData])
    );
  };
  const _deposit = async (wallet: SignerWithAddress, anAmount: number) => {
    await fakeToken.mint(wallet.address, anAmount);
    await fakeToken.connect(wallet).approve(xscrow.address, anAmount);
    await xscrow.connect(wallet).deposit(anAmount);
  };

  beforeEach(async () => {
    jobId = ethers.utils.toUtf8Bytes('7da2702f37fd48e5b1b9a5715e3509b6');
    [owner, wallet1, wallet2, lenderTreasury, vendorTreasury] = await ethers.getSigners();
    fakeLinkToken = await (await ethers.getContractFactory('LinkToken')).deploy();
    fakeOperator = await (await ethers.getContractFactory('FakeOperator')).deploy(fakeLinkToken.address);
    fakeToken = await (await ethers.getContractFactory('FakeToken')).deploy('TokenX', 'TKX');

    oracle = await (
      await ethers.getContractFactory('CreditOracle')
    ).deploy(fakeLinkToken.address, fakeOperator.address, jobId, anApiUrl);

    xscrow = await (
      await ethers.getContractFactory('Xscrow')
    ).deploy(fakeToken.address, lenderTreasury.address, vendorTreasury.address, testIdentifier, oracle.address);

    await xscrow.updateDepositFee(testFee);
    await oracle.updateXscrow(xscrow.address);

    await fakeLinkToken.connect(owner).transfer(oracle.address, '1000000000000000000');
  });

  describe('deploy settings', () => {
    it('new', () => {
      expect(xscrow).to.not.be.null;
    });

    it('ownership', async () => {
      expect(await xscrow.owner()).to.be.equal(owner.address);
    });

    it('token address', async () => {
      expect(await xscrow.tokenAddress()).to.be.equal(fakeToken.address);
    });

    it('identifier', async () => {
      expect(await xscrow.identifier()).to.be.equal(testIdentifier);
    });

    it('oracle', async () => {
      expect(await xscrow.oracle()).to.be.equal(oracle.address);
    });
  });

  describe('pausable', () => {
    it('xscrow is not paused by default', async () => {
      expect(await xscrow.paused()).to.equal(false);
    });

    it('xscrow is paused', async () => {
      await xscrow.pause();

      expect(await xscrow.paused()).to.equal(true);
    });

    it('xscrow is only allow pause by contract owner', async () => {
      await expect(xscrow.connect(wallet1).pause()).to.rejectedWith(ownableRejectedMsg);
    });

    it('xscrow is only allow unpause by contract owner', async () => {
      await xscrow.pause();

      await expect(xscrow.connect(wallet1).unpause()).to.rejectedWith(ownableRejectedMsg);
    });

    it('xscrow is unpaused', async () => {
      await xscrow.pause();

      await xscrow.unpause();

      expect(await xscrow.paused()).to.equal(false);
    });

    it('request withdraw is not allowed on xscrow paused', async () => {
      await xscrow.pause();

      await expect(xscrow.requestWithdraw()).to.rejectedWith(pausableRejectedMsg);
    });

    it('withdraw of is not allowed on xscrow paused', async () => {
      await xscrow.pause();

      await expect(xscrow.withdrawOf(wallet1.address, true)).to.rejectedWith(pausableRejectedMsg);
    });

    it('deposits is not allowed on xscrow paused', async () => {
      await xscrow.pause();

      await expect(xscrow.deposit(1000)).to.rejectedWith(pausableRejectedMsg);
    });

    it('executeDepositOf is not allowed on xscrow paused', async () => {
      await xscrow.pause();

      await expect(xscrow.executeDepositOf(wallet1.address)).to.rejectedWith(pausableRejectedMsg);
    });
  });

  describe('owner execute deposit', () => {
    it('owner can not execute deposit of if balance < 0', async () => {
      await expect(xscrow.executeDepositOf(wallet1.address)).to.rejectedWith();
    });

    it('owner can execute deposit of', async () => {
      await _deposit(wallet1, testAmount);

      await xscrow.executeDepositOf(wallet1.address);

      expect(await fakeToken.balanceOf(xscrow.address)).to.equal(0);
      expect(await fakeToken.balanceOf(wallet1.address)).to.equal(0);
      expect(await xscrow.balanceOf(wallet1.address)).to.equal(0);
      expect(await fakeToken.balanceOf(lenderTreasury.address)).to.equal(testAmount - testFeeAmount);
    });

    it('execute deposit event', async () => {
      await new Promise(async (resolve, reject) => {
        const filter = xscrow.filters.DepositExecuted(wallet1.address);
        xscrow.once(filter, async (aPayee: any, anAmount: any) => {
          try {
            expect(await xscrow.balanceOf(aPayee)).to.equal(0);
            expect(await fakeToken.balanceOf(lenderTreasury.address)).to.equal(testAmount - testFeeAmount);
            expect(anAmount).to.equal(testAmount - testFeeAmount);
            resolve(true);
          } catch (error) {
            reject(false);
          }
        });

        await _deposit(wallet1, testAmount);
        await xscrow.executeDepositOf(wallet1.address);
      });
    });

    it('not owner can execute deposit of', async () => {
      await _deposit(wallet1, testAmount);

      const tx = xscrow.connect(wallet2).executeDepositOf(wallet1.address);

      await expect(tx).to.be.revertedWith(ownableRejectedMsg);
    });
  });

  describe('deposits & withdraw', () => {
    it('deposit event', async () => {
      await new Promise(async (resolve) => {
        const filter = xscrow.filters.Deposit(wallet1.address);
        xscrow.once(filter, async (aPayee: any, anAmount: any) => {
          expect(aPayee).to.equal(wallet1.address);
          expect(await xscrow.balanceOf(aPayee)).to.equal(testAmount - testFeeAmount);
          resolve(true);
        });

        await _deposit(wallet1, testAmount);
      });
    });

    it('request withdraw not allowed', async () => {
      await new Promise(async (resolve) => {
        const filter = xscrow.filters.WithdrawNotAllowed(wallet1.address);
        xscrow.once(filter, (aPayee: any) => {
          expect(wallet1.address).to.equal(aPayee);
          resolve(true);
        });

        _withdraw(false);
      });
    });

    it('request withdraw', async () => {
      await new Promise(async (resolve) => {
        const filter = xscrow.filters.WithdrawSuccessful(wallet1.address);
        xscrow.once(filter, async (aPayee: any) => {
          expect(await fakeToken.balanceOf(aPayee)).to.equal(testAmount - testFeeAmount);
          expect(await xscrow.balanceOf(aPayee)).to.equal(0);
          resolve(true);
        });

        _withdraw(true);
      });
    });

    it('withdraw of is not allowed if not oracle', async () => {
      await expect(xscrow.withdrawOf(wallet1.address, true)).to.rejectedWith(oracleRejectedMsg);
    });

    it('request withdraw without balance', async () => {
      await expect(xscrow.connect(wallet1).requestWithdraw()).rejectedWith(nonZeroAmountRejectedMsg);
    });

    it('reverted deposit amount 0', async () => {
      await expect(xscrow.connect(wallet1).deposit(0)).to.rejectedWith(nonZeroAmountRejectedMsg);
    });

    it('deposit', async () => {
      await _deposit(wallet1, testAmount);

      expect(await fakeToken.balanceOf(wallet1.address)).to.equal(0);
      expect(await fakeToken.balanceOf(lenderTreasury.address)).to.equal(0);
      expect(await fakeToken.balanceOf(vendorTreasury.address)).to.equal(testFeeAmount);
      expect(await xscrow.balanceOf(wallet1.address)).to.equal(testAmount - testFeeAmount);
      expect(await fakeToken.balanceOf(xscrow.address)).to.equal(testAmount - testFeeAmount);
    });

    it('multiple deposits', async () => {
      await fakeToken.mint(wallet1.address, testAmount * 2);
      await fakeToken.connect(wallet1).approve(xscrow.address, testAmount * 2);

      await xscrow.connect(wallet1).deposit(testAmount);
      await xscrow.connect(wallet1).deposit(testAmount);

      expect(await fakeToken.balanceOf(wallet1.address)).to.equal(0);
      expect(await fakeToken.balanceOf(xscrow.address)).to.equal((testAmount - testFeeAmount) * 2);
      expect(await xscrow.balanceOf(wallet1.address)).to.equal((testAmount - testFeeAmount) * 2);
      expect(await fakeToken.balanceOf(vendorTreasury.address)).to.equal(testFeeAmount * 2);
    });

    it('balanceOf', async () => {
      expect(await xscrow.balanceOf(wallet2.address)).to.equal(0);
    });
  });

  describe('updatable properties', () => {
    it('owner can update lenderTreasury', async () => {
      await xscrow.updateLenderTreasury(wallet1.address);

      expect(await xscrow.lenderTreasury()).to.equal(wallet1.address);
    });

    it('not owner cannot update lenderTreasury', async () => {
      const _contract = xscrow.connect(wallet2);

      await expect(_contract.updateLenderTreasury(wallet1.address)).to.revertedWith(ownableRejectedMsg);
    });

    it('owner can update vendor treasury', async () => {
      await xscrow.updateVendorTreasury(wallet1.address);

      expect(await xscrow.vendorTreasury()).to.equal(wallet1.address);
    });

    it('not owner cannot update vendor treasury', async () => {
      const _contract = xscrow.connect(wallet2);

      await expect(_contract.updateVendorTreasury(wallet1.address)).to.revertedWith(ownableRejectedMsg);
    });

    it('owner can update oracle', async () => {
      await xscrow.updateOracle(oracle.address);

      expect(await xscrow.oracle()).to.equal(oracle.address);
    });

    it('not owner cannot update oracle', async () => {
      const _contract = xscrow.connect(wallet2);

      await expect(_contract.updateOracle(wallet1.address)).to.revertedWith(ownableRejectedMsg);
    });

    it('owner can update deposit fee', async () => {
      await xscrow.updateDepositFee(1);

      expect(await xscrow.depositFee()).to.equal(1);
    });

    it('owner cannot update deposit fee with wrong value', async () => {
      await expect(xscrow.updateDepositFee(-1)).to.rejectedWith('value out-of-bounds');
      await expect(xscrow.updateDepositFee(101)).to.revertedWith('Fee value out-of-bounds');
      expect(await xscrow.depositFee()).to.equal(testFee);
    });

    it('not owner cannot update deposit fee', async () => {
      const _contract = xscrow.connect(wallet2);

      await expect(_contract.updateDepositFee(1)).to.revertedWith(ownableRejectedMsg);
    });
  });
});
