import { ethers } from "ethers";
import { mainnet } from "wagmi/chains";
import contracts from "~~/generated/hardhat_contracts";
import scaffoldConfig from "~~/scaffold.config";

const { address: cohortAddress, abi } = contracts[1][0].contracts.SandGardenStreams;

export type WithdrawEvent = {
  id: string;
  builder: string;
  amount: string;
  reason: string;
  timestamp: number;
};

export type CohortEvents = {
  withdrawals: WithdrawEvent[];
  builders: string[];
};

const fetchCohortEvents = async (): Promise<CohortEvents> => {
  const provider = new ethers.providers.JsonRpcBatchProvider(
    `${mainnet.rpcUrls.alchemy.http[0]}/${scaffoldConfig.alchemyApiKey}`,
  );
  const contractInterface = new ethers.utils.Interface(abi);

  const logs = await provider.getLogs({
    address: cohortAddress,
    fromBlock: scaffoldConfig.contracts.SandGardenStreams.fromBlock,
    toBlock: "latest",
  });

  const withdrawLogs: { log: ethers.providers.Log; args: ethers.utils.Result }[] = [];
  const builders: string[] = [];

  logs.forEach(log => {
    let parsed;
    try {
      parsed = contractInterface.parseLog(log);
    } catch (e) {
      // Event not in the ABI (or malformed). Skip it.
      return;
    }

    if (parsed.name === "Withdraw") {
      withdrawLogs.push({ log, args: parsed.args });
    } else if (parsed.name === "AddBuilder" && !builders.includes(parsed.args.to)) {
      builders.push(parsed.args.to);
    }
  });

  // Withdraw has no timestamp, so we read it from the block.
  const blockNumbers = Array.from(new Set(withdrawLogs.map(({ log }) => log.blockNumber)));
  const blocks = await Promise.all(blockNumbers.map(blockNumber => provider.getBlock(blockNumber)));
  const timestampByBlock = new Map(blocks.map(block => [block.number, block.timestamp]));

  const withdrawals = withdrawLogs
    .map(({ log, args }) => ({
      id: `${log.transactionHash}-${log.logIndex}`,
      builder: args.to as string,
      amount: ethers.utils.formatEther(args.amount),
      reason: args.reason as string,
      timestamp: timestampByBlock.get(log.blockNumber) ?? 0,
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  return { withdrawals, builders };
};

let cohortEventsPromise: Promise<CohortEvents> | null = null;

/**
 * Reads every cohort event from the chain once per browser session.
 */
export const getCohortEvents = () => {
  if (!cohortEventsPromise) {
    cohortEventsPromise = fetchCohortEvents().catch(error => {
      cohortEventsPromise = null;
      throw error;
    });
  }
  return cohortEventsPromise;
};
