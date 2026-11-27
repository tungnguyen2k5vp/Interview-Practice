const sample = (args, expected) => ({
  input: args.map(value => JSON.stringify(value)).join(', '),
  output: JSON.stringify(expected),
})

export function codingVariantsV3(n, m, word) {
  const jobs = Array.from({ length: n - 3 }, (_, index) => index + 3)
  const ready = Array.from({ length: n }, (_, index) => index === 1 || index === n - 1)
  return {
    'warehouse-pick-expiry': sample(
      [[[9, n + 1, m], [3, n, 4], [2, n - 1, m], [4, n + 1, m]], n, m + 6],
      [[3, 4], [4, m], [9, 2]],
    ),
    'dispatch-prerequisite-order': sample([n, [[2, 1], [0, 1]]], [0, 2, 1, ...jobs]),
    'billing-usage-tiers': sample([1000000 + m, [n], [50, 1000000]], n * 50 + (1000000 + m - n) * 1000000),
    'stock-next-higher-day': sample([[m, n, n, n + 1, m + 1, n]], [4, 2, 1, 1, 0, 0]),
    'room-peak-occupancy': sample([[[n + 1, n + 3], [n - 1, n + 2], [n, n + 1], [n + 1, n + 4]]], 3),
    'debug-frozen-ready-list': sample([ready, n - 1, false], [[1, n - 1], [1]]),
    'debug-device-code-comparer': sample(
      [[word + '-AB', word + '-CD'], [word + '-ab', word + '-CD ', word + '-cd']],
      [true, false, true],
    ),
    'debug-prune-adjacent-closed': sample([[n, 0, 0, m, m, 0, 0]], [n, m, m]),
  }
}
