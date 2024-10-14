import BigNumber from 'bignumber.js'
import { useWeb3React } from '@pancakeswap/wagmi'
import { SLOW_INTERVAL } from 'config/constants'
import { useCakeBusdPrice } from 'hooks/useBUSDPrice'
import { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from 'state'
import useSWRImmutable from 'swr/immutable'
import { ChainId } from '@pancakeswap/sdk'
import { BIG_ZERO } from '@pancakeswap/utils/bigNumber'
import { getMasterchefContract } from 'utils/contractHelpers'
import { useFastRefreshEffect } from 'hooks/useRefreshEffect'
import { featureFarmApiAtom, useFeatureFlag } from 'hooks/useFeatureFlag'
import { getFarmConfig } from '@pancakeswap/farms/constants'
import { DeserializedFarm, DeserializedFarmsState, DeserializedFarmUserData } from '@pancakeswap/farms'
import { useActiveChainId } from 'hooks/useActiveChainId'
import { fetchFarmsPublicDataAsync, fetchFarmUserDataAsync, fetchInitialFarmsData } from '.'
import { State } from '../types'
import {
  farmFromLpSymbolSelector,
  farmSelector,
  makeBusdPriceFromPidSelector,
  makeFarmFromPidSelector,
  makeLpTokenPriceFromLpSymbolSelector,
  makeUserFarmFromPidSelector,
} from './selectors'

export function useFarmsLength() {
  const { chainId } = useActiveChainId()
  return useSWRImmutable(chainId ? ['farmsLength', chainId] : null, async () => {
    const mc = getMasterchefContract(undefined, chainId)
    return (await mc.poolLength()).toNumber()
  })
}

export const usePollFarmsWithUserData = () => {
  const dispatch = useAppDispatch()
  const { account, chainId } = useWeb3React()
  // const {
  //   proxyAddress,
  //   proxyCreated,
  //   isLoading: isProxyContractLoading,
  // } = useBCakeProxyContractAddress(account, chainId)
  const farmFlag = useFeatureFlag(featureFarmApiAtom)

  // const chainId = ChainId.ARBITRUM

  useSWRImmutable(
    chainId ? ['publicFarmData', chainId] : null,
    async () => {
      const farmsConfig = await getFarmConfig(chainId)
      const pids = farmsConfig.map((farmToFetch) => farmToFetch.pid)
      dispatch(fetchFarmsPublicDataAsync({ pids, chainId, flag: farmFlag }))
    },
    {
      refreshInterval: farmFlag === 'api' ? 50 * 1000 : SLOW_INTERVAL,
    },
  )

  // const name = proxyCreated
  //   ? ['farmsWithUserData', account, proxyAddress, chainId]
  //   : ['farmsWithUserData', account, chainId]

    const name = ['farmsWithUserData', account, chainId]

  useSWRImmutable(
    // account && chainId && !isProxyContractLoading ? name : null,
    account && chainId && name,
    async () => {
      const farmsConfig = await getFarmConfig(chainId)
      const pids = farmsConfig.map((farmToFetch) => farmToFetch.pid)
      // const params = proxyCreated ? { account, pids, proxyAddress, chainId } : { account, pids, chainId }
      const params = { account, pids, chainId }

      dispatch(fetchFarmUserDataAsync(params))
    },
    {
      refreshInterval: SLOW_INTERVAL,
    },
  )
}

/**
 * Fetches the "core" farm data used globally
 * 2 = CAKE-MCOIN LP
 * 3 = BUSD-MCOIN LP
 */
const coreFarmPIDs = {
  56: [2, 3],
  137: [2, 3],
  97: [4, 10],
  5: [13, 11],
  1: [124, 125],
}

export const usePollCoreFarmData = () => {
  const dispatch = useAppDispatch()
  const { chainId } = useActiveChainId()
  const farmFlag = useFeatureFlag(featureFarmApiAtom)

  useEffect(() => {
    if (chainId) {
      dispatch(fetchInitialFarmsData({ chainId }))
    }
  }, [chainId, dispatch])

  useFastRefreshEffect(() => {
    if (chainId && farmFlag !== 'api') {
      dispatch(fetchFarmsPublicDataAsync({ pids: coreFarmPIDs[chainId], chainId, flag: farmFlag }))
    }
  }, [dispatch, chainId, farmFlag])
}

export const useFarms = (): DeserializedFarmsState => {
  const { chainId } = useActiveChainId()
  return useSelector(useMemo(() => farmSelector(chainId), [chainId]))
}

export const useFarmsPoolLength = (): number => {
  return useSelector((state: State) => state.farms.poolLength)
}

export const useFarmFromPid = (pid: number): DeserializedFarm => {
  const farmFromPid = useMemo(() => makeFarmFromPidSelector(pid), [pid])
  return useSelector(farmFromPid)
}

export const useFarmFromLpSymbol = (lpSymbol: string): DeserializedFarm => {
  const farmFromLpSymbol = useMemo(() => farmFromLpSymbolSelector(lpSymbol), [lpSymbol])
  return useSelector(farmFromLpSymbol)
}

export const useFarmUser = (pid: number): DeserializedFarmUserData => {
  const farmFromPidUser = useMemo(() => makeUserFarmFromPidSelector(pid), [pid])
  return useSelector(farmFromPidUser)
}

// Return the base token price for a farm, from a given pid
export const useBusdPriceFromPid = (pid: number): BigNumber => {
  const busdPriceFromPid = useMemo(() => makeBusdPriceFromPidSelector(pid), [pid])
  return useSelector(busdPriceFromPid)
}

export const useLpTokenPrice = (symbol: string, isTokenOnly?: boolean) => {
  const lpTokenPriceFromLpSymbol = useMemo(() => makeLpTokenPriceFromLpSymbolSelector(symbol, isTokenOnly), [symbol])
  return useSelector(lpTokenPriceFromLpSymbol)
}

/**
 * @deprecated use the BUSD hook in /hooks
 */
export const usePriceCakeBusd = ({ forceMainnet } = { forceMainnet: false }): BigNumber => {
  const price = useCakeBusdPrice({ forceMainnet })
  return useMemo(() => (price ? new BigNumber(price.toSignificant(6)) : BIG_ZERO), [price])
}