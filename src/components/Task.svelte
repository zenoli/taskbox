<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  // event handler for Pin Task
  function PinTask() {
    dispatch('onPinTask', {
      id: task.id,
    });
  }

  // event handler for Archive Task
  function ArchiveTask() {
    dispatch('onArchiveTask', {
      id: task.id,
    });
  }

  // Task props
  export let task = {
    id: '',
    title: '',
    state: '',
      updatedAt: new Date(2021, 0, 1, 9, 0),
  };
    // Reactive declaration (computed prop in other frameworks)
    $: isChecked = task.state === 'TASK_ARCHIVED';
</script>

 <div class="list-item {task.state}">
  <label class="checkbox">
    <input type="checkbox" checked={isChecked} disabled name="checked" />
    <span class="checkbox-custom" on:click={ArchiveTask} aria-label={`archiveTask-${task.id}`}/>
  </label>
  <div class="title">
        <input
            type="text"
            readonly
            value={task.title}
            placeholder="Input title"
            style="background: red;"
        />
  </div>
  <div class="actions">
    {#if task.state !== 'TASK_ARCHIVED'}
    <a href="/" on:click|preventDefault={PinTask}>
      <span class="icon-star" aria-label={`pinTask-${task.id}`}/>
    </a>
    {/if}
  </div>
 </div>
