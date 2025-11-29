/**
 * Redis utilities - main exports
 */
export { default as redis } from './client';
export { storeTrip, getTrip } from './trip';
export { storeFlight, getFlight } from './flight';
export { storeLeg, getLegsByTrip } from './leg';
export { storeDeal, getDealsByTrip } from './deal';
export { storeSearchJob, getSearchJob } from './search';
export { calculateExpiration } from './expiration';
export { clearAllData } from './clear';

