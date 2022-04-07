
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    // A simple Svelte store implementation with update methods and initial data.

    const TaskBox = () => {
      // Creates a new writable store populated with some initial data
      const { subscribe, update } = writable([
        { id: '1', title: 'Something', state: 'TASK_INBOX' },
        { id: '2', title: 'Something more', state: 'TASK_INBOX' },
        { id: '3', title: 'Something else', state: 'TASK_INBOX' },
        { id: '4', title: 'Something again', state: 'TASK_INBOX' },
      ]);

      return {
        subscribe,
        // Method to archive a task, think of a action with redux or Vuex
        archiveTask: id =>
          update(tasks =>
            tasks.map(task => (task.id === id ? { ...task, state: 'TASK_ARCHIVED' } : task))
          ),
        // Method to archive a task, think of a action with redux or Vuex
        pinTask: id =>
          update(tasks =>
            tasks.map(task => (task.id === id ? { ...task, state: 'TASK_PINNED' } : task))
          ),
      };
    };
    const taskStore = TaskBox();

    // Store to handle the app state
    const AppState = () => {
     const { subscribe, update } = writable(false);
     return {
       subscribe,
       error: () => update(error => !error),
     };
    };

    const AppStore = AppState();

    /* src/components/Task.svelte generated by Svelte v3.31.2 */
    const file = "src/components/Task.svelte";

    // (40:4) {#if task.state !== 'TASK_ARCHIVED'}
    function create_if_block(ctx) {
    	let a;
    	let span;
    	let span_aria_label_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			span = element("span");
    			attr_dev(span, "class", "icon-star");
    			attr_dev(span, "aria-label", span_aria_label_value = `pinTask-${/*task*/ ctx[0].id}`);
    			add_location(span, file, 41, 6, 1083);
    			attr_dev(a, "href", "/");
    			add_location(a, file, 40, 4, 1030);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, span);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", prevent_default(/*PinTask*/ ctx[2]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*task*/ 1 && span_aria_label_value !== (span_aria_label_value = `pinTask-${/*task*/ ctx[0].id}`)) {
    				attr_dev(span, "aria-label", span_aria_label_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:4) {#if task.state !== 'TASK_ARCHIVED'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let label;
    	let input0;
    	let t0;
    	let span;
    	let span_aria_label_value;
    	let t1;
    	let div0;
    	let input1;
    	let input1_value_value;
    	let t2;
    	let div1;
    	let div2_class_value;
    	let mounted;
    	let dispose;
    	let if_block = /*task*/ ctx[0].state !== "TASK_ARCHIVED" && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			label = element("label");
    			input0 = element("input");
    			t0 = space();
    			span = element("span");
    			t1 = space();
    			div0 = element("div");
    			input1 = element("input");
    			t2 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(input0, "type", "checkbox");
    			input0.checked = /*isChecked*/ ctx[1];
    			input0.disabled = true;
    			attr_dev(input0, "name", "checked");
    			add_location(input0, file, 32, 4, 672);
    			attr_dev(span, "class", "checkbox-custom");
    			attr_dev(span, "aria-label", span_aria_label_value = `archiveTask-${/*task*/ ctx[0].id}`);
    			add_location(span, file, 33, 4, 746);
    			attr_dev(label, "class", "checkbox");
    			add_location(label, file, 31, 2, 643);
    			attr_dev(input1, "type", "text");
    			input1.readOnly = true;
    			input1.value = input1_value_value = /*task*/ ctx[0].title;
    			attr_dev(input1, "placeholder", "Input title");
    			add_location(input1, file, 36, 4, 876);
    			attr_dev(div0, "class", "title");
    			add_location(div0, file, 35, 2, 852);
    			attr_dev(div1, "class", "actions");
    			add_location(div1, file, 38, 2, 963);
    			attr_dev(div2, "class", div2_class_value = "list-item " + /*task*/ ctx[0].state);
    			add_location(div2, file, 30, 1, 604);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, label);
    			append_dev(label, input0);
    			append_dev(label, t0);
    			append_dev(label, span);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, input1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			if (if_block) if_block.m(div1, null);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*ArchiveTask*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*isChecked*/ 2) {
    				prop_dev(input0, "checked", /*isChecked*/ ctx[1]);
    			}

    			if (dirty & /*task*/ 1 && span_aria_label_value !== (span_aria_label_value = `archiveTask-${/*task*/ ctx[0].id}`)) {
    				attr_dev(span, "aria-label", span_aria_label_value);
    			}

    			if (dirty & /*task*/ 1 && input1_value_value !== (input1_value_value = /*task*/ ctx[0].title) && input1.value !== input1_value_value) {
    				prop_dev(input1, "value", input1_value_value);
    			}

    			if (/*task*/ ctx[0].state !== "TASK_ARCHIVED") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*task*/ 1 && div2_class_value !== (div2_class_value = "list-item " + /*task*/ ctx[0].state)) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let isChecked;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Task", slots, []);
    	const dispatch = createEventDispatcher();

    	// event handler for Pin Task
    	function PinTask() {
    		dispatch("onPinTask", { id: task.id });
    	}

    	// event handler for Archive Task
    	function ArchiveTask() {
    		dispatch("onArchiveTask", { id: task.id });
    	}

    	let { task = {
    		id: "",
    		title: "",
    		state: "",
    		updatedAt: new Date(2021, 0, 1, 9, 0)
    	} } = $$props;

    	const writable_props = ["task"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Task> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("task" in $$props) $$invalidate(0, task = $$props.task);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		PinTask,
    		ArchiveTask,
    		task,
    		isChecked
    	});

    	$$self.$inject_state = $$props => {
    		if ("task" in $$props) $$invalidate(0, task = $$props.task);
    		if ("isChecked" in $$props) $$invalidate(1, isChecked = $$props.isChecked);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*task*/ 1) {
    			// Reactive declaration (computed prop in other frameworks)
    			 $$invalidate(1, isChecked = task.state === "TASK_ARCHIVED");
    		}
    	};

    	return [task, isChecked, PinTask, ArchiveTask];
    }

    class Task extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { task: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Task",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get task() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set task(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/LoadingRow.svelte generated by Svelte v3.31.2 */

    const file$1 = "src/components/LoadingRow.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let span0;
    	let t0;
    	let span4;
    	let span1;
    	let t2;
    	let span2;
    	let t4;
    	let span3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			t0 = space();
    			span4 = element("span");
    			span1 = element("span");
    			span1.textContent = "Loading";
    			t2 = space();
    			span2 = element("span");
    			span2.textContent = "cool";
    			t4 = space();
    			span3 = element("span");
    			span3.textContent = "state";
    			attr_dev(span0, "class", "glow-checkbox");
    			add_location(span0, file$1, 1, 2, 29);
    			add_location(span1, file$1, 3, 4, 91);
    			add_location(span2, file$1, 4, 4, 116);
    			add_location(span3, file$1, 5, 4, 138);
    			attr_dev(span4, "class", "glow-text");
    			add_location(span4, file$1, 2, 2, 62);
    			attr_dev(div, "class", "loading-item");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t0);
    			append_dev(div, span4);
    			append_dev(span4, span1);
    			append_dev(span4, t2);
    			append_dev(span4, span2);
    			append_dev(span4, t4);
    			append_dev(span4, span3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("LoadingRow", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LoadingRow> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class LoadingRow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LoadingRow",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/PureTaskList.svelte generated by Svelte v3.31.2 */
    const file$2 = "src/components/PureTaskList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (15:2) {#if loading}
    function create_if_block_1(ctx) {
    	let div;
    	let loadingrow0;
    	let t0;
    	let loadingrow1;
    	let t1;
    	let loadingrow2;
    	let t2;
    	let loadingrow3;
    	let t3;
    	let loadingrow4;
    	let t4;
    	let loadingrow5;
    	let current;
    	loadingrow0 = new LoadingRow({ $$inline: true });
    	loadingrow1 = new LoadingRow({ $$inline: true });
    	loadingrow2 = new LoadingRow({ $$inline: true });
    	loadingrow3 = new LoadingRow({ $$inline: true });
    	loadingrow4 = new LoadingRow({ $$inline: true });
    	loadingrow5 = new LoadingRow({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(loadingrow0.$$.fragment);
    			t0 = space();
    			create_component(loadingrow1.$$.fragment);
    			t1 = space();
    			create_component(loadingrow2.$$.fragment);
    			t2 = space();
    			create_component(loadingrow3.$$.fragment);
    			t3 = space();
    			create_component(loadingrow4.$$.fragment);
    			t4 = space();
    			create_component(loadingrow5.$$.fragment);
    			attr_dev(div, "class", "list-items");
    			add_location(div, file$2, 15, 4, 452);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(loadingrow0, div, null);
    			append_dev(div, t0);
    			mount_component(loadingrow1, div, null);
    			append_dev(div, t1);
    			mount_component(loadingrow2, div, null);
    			append_dev(div, t2);
    			mount_component(loadingrow3, div, null);
    			append_dev(div, t3);
    			mount_component(loadingrow4, div, null);
    			append_dev(div, t4);
    			mount_component(loadingrow5, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loadingrow0.$$.fragment, local);
    			transition_in(loadingrow1.$$.fragment, local);
    			transition_in(loadingrow2.$$.fragment, local);
    			transition_in(loadingrow3.$$.fragment, local);
    			transition_in(loadingrow4.$$.fragment, local);
    			transition_in(loadingrow5.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loadingrow0.$$.fragment, local);
    			transition_out(loadingrow1.$$.fragment, local);
    			transition_out(loadingrow2.$$.fragment, local);
    			transition_out(loadingrow3.$$.fragment, local);
    			transition_out(loadingrow4.$$.fragment, local);
    			transition_out(loadingrow5.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(loadingrow0);
    			destroy_component(loadingrow1);
    			destroy_component(loadingrow2);
    			destroy_component(loadingrow3);
    			destroy_component(loadingrow4);
    			destroy_component(loadingrow5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(15:2) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (25:2) {#if emptyTasks}
    function create_if_block$1(ctx) {
    	let div3;
    	let div2;
    	let span;
    	let t0;
    	let div0;
    	let t2;
    	let div1;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			span = element("span");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "You have no tasks";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "Sit back and relax";
    			attr_dev(span, "class", "icon-check");
    			add_location(span, file$2, 27, 8, 714);
    			attr_dev(div0, "class", "title-message");
    			add_location(div0, file$2, 28, 8, 750);
    			attr_dev(div1, "class", "subtitle-message");
    			add_location(div1, file$2, 29, 8, 809);
    			attr_dev(div2, "class", "wrapper-message");
    			add_location(div2, file$2, 26, 6, 676);
    			attr_dev(div3, "class", "list-items");
    			add_location(div3, file$2, 25, 4, 645);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, span);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(25:2) {#if emptyTasks}",
    		ctx
    	});

    	return block;
    }

    // (34:2) {#each tasksInOrder as task}
    function create_each_block(ctx) {
    	let task;
    	let current;

    	task = new Task({
    			props: { task: /*task*/ ctx[7] },
    			$$inline: true
    		});

    	task.$on("onPinTask", /*onPinTask_handler*/ ctx[5]);
    	task.$on("onArchiveTask", /*onArchiveTask_handler*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(task.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(task, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const task_changes = {};
    			if (dirty & /*tasksInOrder*/ 4) task_changes.task = /*task*/ ctx[7];
    			task.$set(task_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(task.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(task.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(task, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(34:2) {#each tasksInOrder as task}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let t0;
    	let t1;
    	let each_1_anchor;
    	let current;
    	let if_block0 = /*loading*/ ctx[0] && create_if_block_1(ctx);
    	let if_block1 = /*emptyTasks*/ ctx[1] && create_if_block$1(ctx);
    	let each_value = /*tasksInOrder*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*loading*/ ctx[0]) {
    				if (if_block0) {
    					if (dirty & /*loading*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*emptyTasks*/ ctx[1]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*tasksInOrder*/ 4) {
    				each_value = /*tasksInOrder*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let noTasks;
    	let emptyTasks;
    	let tasksInOrder;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PureTaskList", slots, []);
    	let { loading = false } = $$props;
    	let { tasks = [] } = $$props;
    	const writable_props = ["loading", "tasks"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PureTaskList> was created with unknown prop '${key}'`);
    	});

    	function onPinTask_handler(event) {
    		bubble($$self, event);
    	}

    	function onArchiveTask_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("loading" in $$props) $$invalidate(0, loading = $$props.loading);
    		if ("tasks" in $$props) $$invalidate(3, tasks = $$props.tasks);
    	};

    	$$self.$capture_state = () => ({
    		Task,
    		LoadingRow,
    		loading,
    		tasks,
    		noTasks,
    		emptyTasks,
    		tasksInOrder
    	});

    	$$self.$inject_state = $$props => {
    		if ("loading" in $$props) $$invalidate(0, loading = $$props.loading);
    		if ("tasks" in $$props) $$invalidate(3, tasks = $$props.tasks);
    		if ("noTasks" in $$props) $$invalidate(4, noTasks = $$props.noTasks);
    		if ("emptyTasks" in $$props) $$invalidate(1, emptyTasks = $$props.emptyTasks);
    		if ("tasksInOrder" in $$props) $$invalidate(2, tasksInOrder = $$props.tasksInOrder);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*tasks*/ 8) {
    			//👇 Reactive declarations (computed props in other frameworks)
    			 $$invalidate(4, noTasks = tasks.length === 0);
    		}

    		if ($$self.$$.dirty & /*noTasks, loading*/ 17) {
    			 $$invalidate(1, emptyTasks = noTasks && !loading);
    		}

    		if ($$self.$$.dirty & /*tasks*/ 8) {
    			 $$invalidate(2, tasksInOrder = [
    				...tasks.filter(t => t.state === "TASK_PINNED"),
    				...tasks.filter(t => t.state !== "TASK_PINNED")
    			]);
    		}
    	};

    	return [
    		loading,
    		emptyTasks,
    		tasksInOrder,
    		tasks,
    		noTasks,
    		onPinTask_handler,
    		onArchiveTask_handler
    	];
    }

    class PureTaskList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { loading: 0, tasks: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PureTaskList",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get loading() {
    		throw new Error("<PureTaskList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set loading(value) {
    		throw new Error("<PureTaskList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tasks() {
    		throw new Error("<PureTaskList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tasks(value) {
    		throw new Error("<PureTaskList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/TaskList.svelte generated by Svelte v3.31.2 */
    const file$3 = "src/components/TaskList.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let puretasklist;
    	let current;

    	puretasklist = new PureTaskList({
    			props: { tasks: /*$taskStore*/ ctx[0] },
    			$$inline: true
    		});

    	puretasklist.$on("onPinTask", /*onPinTask*/ ctx[1]);
    	puretasklist.$on("onArchiveTask", /*onArchiveTask*/ ctx[2]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(puretasklist.$$.fragment);
    			add_location(div, file$3, 11, 0, 268);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(puretasklist, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const puretasklist_changes = {};
    			if (dirty & /*$taskStore*/ 1) puretasklist_changes.tasks = /*$taskStore*/ ctx[0];
    			puretasklist.$set(puretasklist_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(puretasklist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(puretasklist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(puretasklist);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $taskStore;
    	validate_store(taskStore, "taskStore");
    	component_subscribe($$self, taskStore, $$value => $$invalidate(0, $taskStore = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TaskList", slots, []);

    	function onPinTask(event) {
    		taskStore.pinTask(event.detail.id);
    	}

    	function onArchiveTask(event) {
    		taskStore.archiveTask(event.detail.id);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TaskList> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		PureTaskList,
    		taskStore,
    		onPinTask,
    		onArchiveTask,
    		$taskStore
    	});

    	return [$taskStore, onPinTask, onArchiveTask];
    }

    class TaskList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TaskList",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/InboxScreen.svelte generated by Svelte v3.31.2 */
    const file$4 = "src/components/InboxScreen.svelte";

    // (15:2) {:else}
    function create_else_block(ctx) {
    	let div;
    	let nav;
    	let h1;
    	let span;
    	let t1;
    	let tasklist;
    	let current;
    	tasklist = new TaskList({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			nav = element("nav");
    			h1 = element("h1");
    			span = element("span");
    			span.textContent = "Taskbox";
    			t1 = space();
    			create_component(tasklist.$$.fragment);
    			attr_dev(span, "class", "title-wrapper");
    			add_location(span, file$4, 18, 10, 456);
    			attr_dev(h1, "class", "title-page");
    			add_location(h1, file$4, 17, 8, 422);
    			add_location(nav, file$4, 16, 6, 408);
    			attr_dev(div, "class", "page lists-show");
    			add_location(div, file$4, 15, 4, 372);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, nav);
    			append_dev(nav, h1);
    			append_dev(h1, span);
    			append_dev(div, t1);
    			mount_component(tasklist, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tasklist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tasklist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(tasklist);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(15:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (7:2) {#if error}
    function create_if_block$2(ctx) {
    	let div3;
    	let div2;
    	let span;
    	let t0;
    	let div0;
    	let t2;
    	let div1;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			span = element("span");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "Oh no!";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "Something went wrong";
    			attr_dev(span, "class", "icon-face-sad");
    			add_location(span, file$4, 9, 8, 190);
    			attr_dev(div0, "class", "title-message");
    			add_location(div0, file$4, 10, 8, 229);
    			attr_dev(div1, "class", "subtitle-message");
    			add_location(div1, file$4, 11, 8, 277);
    			attr_dev(div2, "class", "wrapper-message");
    			add_location(div2, file$4, 8, 6, 152);
    			attr_dev(div3, "class", "page lists-show");
    			add_location(div3, file$4, 7, 4, 116);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, span);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(7:2) {#if error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*error*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			add_location(div, file$4, 5, 0, 92);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("InboxScreen", slots, []);
    	let { error = false } = $$props;
    	const writable_props = ["error"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<InboxScreen> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    	};

    	$$self.$capture_state = () => ({ TaskList, error });

    	$$self.$inject_state = $$props => {
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [error];
    }

    class InboxScreen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { error: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InboxScreen",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get error() {
    		throw new Error("<InboxScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set error(value) {
    		throw new Error("<InboxScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.31.2 */

    function create_fragment$5(ctx) {
    	let inboxscreen;
    	let current;

    	inboxscreen = new InboxScreen({
    			props: { error: /*$AppStore*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(inboxscreen.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(inboxscreen, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const inboxscreen_changes = {};
    			if (dirty & /*$AppStore*/ 1) inboxscreen_changes.error = /*$AppStore*/ ctx[0];
    			inboxscreen.$set(inboxscreen_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inboxscreen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inboxscreen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(inboxscreen, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $AppStore;
    	validate_store(AppStore, "AppStore");
    	component_subscribe($$self, AppStore, $$value => $$invalidate(0, $AppStore = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ AppStore, InboxScreen, $AppStore });
    	return [$AppStore];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
