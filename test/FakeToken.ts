import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { FakeToken } from '../typechain-types';

describe('FakeToken', () => {
  const tokenName = 'FakeToken';
  const tokenSymbol = 'FkTk';
  let token: FakeToken;
  let owner: SignerWithAddress;
  let wallet1: SignerWithAddress;

  beforeEach(async () => {
    token = await (await ethers.getContractFactory('FakeToken')).deploy(tokenName, tokenSymbol);
    [owner, wallet1] = await ethers.getSigners();
  });

  it('new', () => {
    expect(token).to.not.be.null;
  });

  it('default decimals', async () => {
    expect(await token.decimals()).to.not.be.null;
    expect(await token.decimals()).to.be.equal(18);
  });

  it('custom decimals', async () => {
    const customDecimal = 6;

    await token.setDecimals(customDecimal);

    expect(await token.decimals()).to.be.equal(customDecimal);
  });

  it('mint', async () => {
    const amountToMint = 3;

    await token.mint(wallet1.address, amountToMint);

    expect(await token.balanceOf(wallet1.address)).to.be.equal(amountToMint);
  });

  it('burn', async () => {
    const amountToMint = 3;
    await token.mint(wallet1.address, amountToMint);

    await token.connect(wallet1).burn(amountToMint);

    expect(await token.balanceOf(wallet1.address)).to.be.equal(0);
  });

  it('approve', async () => {
    const ownerInitBalance = await token.balanceOf(owner.address);
    await token.approve(wallet1.address, 500);

    await token.connect(wallet1).transferFrom(owner.address, wallet1.address, 500);

    expect(await token.balanceOf(wallet1.address)).to.equal(500);
    expect(await token.balanceOf(owner.address)).to.equal(ownerInitBalance.sub(500));
  });
});
