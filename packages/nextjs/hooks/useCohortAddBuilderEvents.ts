import { useEffect, useState } from "react";
import { getCohortEvents } from "~~/services/web3/cohortEvents";

export const useAddBuilderEvents = () => {
  const [data, setData] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCohortEvents()
      .then(events => {
        if (isMounted) setData(events.builders);
      })
      .catch(error => console.error("Error getting cohort builder events: ", error))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading };
};
