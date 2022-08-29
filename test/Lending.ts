import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import {
  Lending,
  Lending__factory,
  TetherToken,
  TetherToken__factory,
} from "../typechain-types/index";

use(solidity);

describe("Lending", function () {
  //contract metadata and deployments
  let Lending: Lending__factory;
  let lending: Lending;
  let Tether: TetherToken__factory;
  let tether: TetherToken;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  //testing params
  const million = ethers.utils.parseUnits("1000000", "mwei");
  const hundred = ethers.utils.parseUnits("100", "mwei");
  const thousand = ethers.utils.parseUnits("1000", "mwei");

  before(async function () {
    // Contracts are deployed using the first signer/account by default

    Lending = (await ethers.getContractFactory(
      "Lending",
      owner
    )) as Lending__factory;
    Tether = (await ethers.getContractFactory(
      "TetherToken",
      owner
    )) as TetherToken__factory;
  });

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    tether = await Tether.deploy("1000100000000", "Tether", "USDT", 6); //as TetherToken;
    await tether.deployed();
    lending = await Lending.deploy(tether.address); //as Lending;
    await lending.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy correctly", async function () {
      // const { tether, lending } = await loadFixture(deployLending);
      expect(await tether.balanceOf(owner.address)).to.be.equal(
        million.add(hundred)
      );
      expect((await lending.currency()).toString()).to.be.equal(
        tether.address.toString()
      );
    });

    it("Should set the right owner", async function () {
      // const { lock, owner } = await loadFixture(deployOneYearLockFixture);

      expect(await lending.owner()).to.equal(owner.address);
      expect(await tether.owner()).to.equal(owner.address);
    });
  });

  describe("borrow", function () {
    it("after borrow all stakeholders should have correct balances ", async function () {
      //transfer 1 million to a lending contract
      await tether.connect(owner).transfer(lending.address, million);
      //transfer 100 wei to user to be used as an interest repayment.
      await tether.connect(owner).transfer(user.address, hundred);

      //check balance pre borrow
      const balance = await tether.balanceOf(lending.address);
      const balanceUser = await tether.balanceOf(user.address);
      expect(balance).to.be.equal(million);
      expect(balanceUser).to.be.equal(hundred);

      //borrow 1000 usdt = 1000 * 10^6 wei
      await lending.connect(user).borrow(thousand);

      //check balance post borrow
      const balanceLendingAfter = await tether.balanceOf(lending.address);
      const balanceUserAfter = await tether.balanceOf(user.address);
      expect(balanceLendingAfter).to.be.equal(million.sub(thousand));
      expect(balanceUserAfter).to.be.equal(thousand.add(hundred));
    });

    it("Should fail if amount is less than 0", async function () {
      await expect(lending.connect(user).borrow(0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });

    it("Should fail if usdt in the contract is less than borrow amount", async function () {
      //transfer 1 million to a lending contract
      await tether.connect(owner).transfer(lending.address, hundred);
      //transfer 100 wei to user to be used as an interest repayment.
      await tether.connect(owner).transfer(user.address, hundred);

      //check balance pre borrow
      const balance = await tether.balanceOf(lending.address);
      expect(balance).to.be.equal(hundred);

      //borrow 1000 usdt
      await expect(lending.connect(user).borrow(thousand)).to.be.revertedWith(
        "borrow amoun exceeds contract balance"
      );
    });

    it("Should fail if user have not repaid the previous borrowed money", async function () {
      //transfer 1 million to a lending contract
      await tether.connect(owner).transfer(lending.address, million);
      //transfer 100 wei to user to be used as an interest repayment.
      await tether.connect(owner).transfer(user.address, hundred);

      //borrow 1st time
      await lending.connect(user).borrow(thousand);

      //borrow 1000 usdt
      await expect(lending.connect(user).borrow(thousand)).to.be.revertedWith(
        "You already have borrowed"
      );
    });

    it("Should be able to borrow after repaid", async function () {
      //transfer 1 million to a lending contract
      await tether.connect(owner).transfer(lending.address, million);
      //transfer 100 wei to user to be used as an interest repayment.
      await tether.connect(owner).transfer(user.address, hundred);

      //borrow 1st time
      await lending.connect(user).borrow(thousand);

      //repay 1st time
      await tether
        .connect(user)
        .approve(lending.address, thousand.add(hundred));
      await lending.connect(user).repay();

      //borrow 1000 usdt
      await lending.connect(user).borrow(thousand);
    });
  });

  describe("repay", function () {
    it("after repay all stakeholders should have correct balances ", async function () {
      //transfer 1 million to a lending contract
      await tether.connect(owner).transfer(lending.address, million);
      //transfer 100 wei to user to be used as an interest repayment.
      await tether.connect(owner).transfer(user.address, hundred);

      //borrow 1000 usdt = 1000 * 10^6 wei
      await lending.connect(user).borrow(thousand);

      //check balance post borrow
      const balanceLendingAfter = await tether.balanceOf(lending.address);
      const balanceUserAfter = await tether.balanceOf(user.address);
      expect(balanceLendingAfter).to.be.equal(million.sub(thousand));
      expect(balanceUserAfter).to.be.equal(thousand.add(hundred));

      //old usdt contract doesn't have safeTransferFrom so user needs to approve directly through tether contract not through lending contract
      await tether
        .connect(user)
        .approve(lending.address, thousand.add(hundred));

      //repay 1100 usdt
      await lending.connect(user).repay();
      const balanceLendingRepay = await tether.balanceOf(lending.address);
      const balanceUserfinal = await tether.balanceOf(user.address);
      expect(balanceLendingRepay).to.be.equal(million.add(hundred));
      expect(balanceUserfinal).to.be.equal(0);
    });
  });

  describe("withdraw", function () {
    it("after owner withdraw, he should have a correct balance ", async function () {
      //transfer 1 million to a lending contract
      await tether.connect(owner).transfer(lending.address, million);
      //transfer 100 wei to user to be used as an interest repayment.
      const balanceOwner = await tether.balanceOf(owner.address);
      const balanceLending = await tether.balanceOf(lending.address);
      expect(balanceOwner).to.be.equal(hundred);
      expect(balanceLending).to.be.equal(million);

      //withdraw 1000 usdt = 1000 * 10^6 wei
      // await lending.connect(owner).pause();
      await lending.connect(owner).withdraw(thousand);

      // //check balance post withdraw
      const balanceOwnerAfter = await tether.balanceOf(owner.address);
      const balanceLendingAfter = await tether.balanceOf(lending.address);
      expect(balanceOwnerAfter).to.be.equal(thousand.add(hundred));
      expect(balanceLendingAfter).to.be.equal(million.sub(thousand));
    });
  });
});
