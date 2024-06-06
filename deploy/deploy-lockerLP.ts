import { HardhatRuntimeEnvironment } from "hardhat/types";

const LP_TOKEN_ADDRESS = "0x0040F36784dDA0821E74BA67f86E084D70d67a3A";
const WETH = "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f";
const SECONDS_IN_THREE_DAYS = 86400 * 7;
const ZERO_PYTH_AGGREGATOR = "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const POOL_VOTER_ADDRESS = (await get("VotingPowerCombined")).address;
  const LP_ORACLE = (await get("LPOracle")).address;
  if (
    !LP_TOKEN_ADDRESS.length ||
    !ZERO_PYTH_AGGREGATOR.length ||
    !WETH.length ||
    !LP_ORACLE.length ||
    !POOL_VOTER_ADDRESS.length
  )
    throw new Error("Invalid init arguments");

  const deploymentLocker = await deploy("LockerLP", {
    from: deployer,
    contract: "LockerLP",
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
    },
    autoMine: true,
    log: true,
  });

  const deploymentStaking = await deploy("OmnichainStakingLP", {
    from: deployer,
    contract: "OmnichainStakingLP",
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
    },
    autoMine: true,
    log: true,
    waitConfirmations: 3,
  });

  // init the proxies
  const locker = await hre.ethers.getContractAt(
    "LockerLP",
    deploymentLocker.address
  );

  const staking = await hre.ethers.getContractAt(
    "OmnichainStakingLP",
    deploymentStaking.address
  );

  console.log("init locker");
  (await locker.init(LP_TOKEN_ADDRESS, staking.target)).wait(3);

  console.log("init staking");
  (
    await staking.init(
      locker.target,
      WETH,
      POOL_VOTER_ADDRESS,
      SECONDS_IN_THREE_DAYS,
      LP_ORACLE,
      ZERO_PYTH_AGGREGATOR
    )
  ).wait(1);

  await hre.run("verify:verify", { address: deploymentLocker.address });
  await hre.run("verify:verify", { address: deploymentStaking.address });
}

main.tags = ["LockerLP"];
export default main;
