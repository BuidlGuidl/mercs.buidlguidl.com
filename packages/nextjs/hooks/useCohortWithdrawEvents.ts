import { useEffect, useState } from "react";
import { WithdrawEvent, getCohortEvents } from "~~/services/web3/cohortEvents";

export const useCohortWithdrawEvents = () => {
  const [data, setData] = useState<WithdrawEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCohortEvents()
      .then(events => {
        if (isMounted) setData(events.withdrawals);
      })
      .catch(error => console.error("Error getting cohort withdraw events: ", error))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading };
};
