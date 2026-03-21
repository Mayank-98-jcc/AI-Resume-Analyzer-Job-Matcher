const premiumQueue = {
  pending: Promise.resolve()
};

const normalQueue = {
  pending: Promise.resolve()
};

function enqueue(queue, task) {
  const nextTask = queue.pending.then(task, task);
  queue.pending = nextTask.catch(() => {});
  return nextTask;
}

function enqueuePremiumTask(task) {
  return enqueue(premiumQueue, task);
}

function enqueueNormalTask(task) {
  return enqueue(normalQueue, task);
}

module.exports = {
  premiumQueue,
  normalQueue,
  enqueuePremiumTask,
  enqueueNormalTask
};
