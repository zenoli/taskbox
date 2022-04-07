<script>
  import './index.css'
  import { AppStore } from './store';
  import InboxScreen from './components/InboxScreen.svelte';
</script>

<InboxScreen error="{$AppStore}" />
