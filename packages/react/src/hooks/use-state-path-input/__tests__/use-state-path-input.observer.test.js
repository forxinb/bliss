const React = require('react');
const { render, act, fireEvent } = require('@testing-library/react');
const { makeAutoObservable } = require('mobx');
const { observer } = require('mobx-react-lite');
const useStatePathInput = require('../use-state-path-input');

describe('useStatePathInput with MobX Observer', () => {
  let state;

  beforeEach(() => {
    state = makeAutoObservable({
      user: {
        name: 'John'
      }
    });
  });

  test('should automatically re-render when MobX state changes', () => {
    let renderCount = 0;
    let lastRenderedValue = null;

    const TestComponent = observer(() => {
      renderCount++;
      const { value } = useStatePathInput({ state, path: 'user.name' });
      lastRenderedValue = value;
      return <div data-testid="value">{value}</div>;
    });

    const { getByTestId } = render(<TestComponent />);

    // Initial render
    expect(renderCount).toBe(1);
    expect(lastRenderedValue).toBe('John');
    expect(getByTestId('value').textContent).toBe('John');

    // Update state directly (outside the hook)
    act(() => {
      state.user.name = 'Jane';
    });

    // Should automatically re-render because of MobX + observer
    expect(renderCount).toBe(2);
    expect(lastRenderedValue).toBe('Jane');
    expect(getByTestId('value').textContent).toBe('Jane');
  });

  test('should update state and re-render via onChangeValue', () => {
    let lastRenderedValue = null;

    const TestComponent = observer(() => {
      const { value, onChangeValue } = useStatePathInput({
        state,
        path: 'user.name',
        getValueToSet: (v) => v
      });
      lastRenderedValue = value;

      return (
        <button
          data-testid="btn"
          onClick={() => onChangeValue('Jane')}
        >
          {value}
        </button>
      );
    });

    const { getByTestId } = render(<TestComponent />);

    expect(lastRenderedValue).toBe('John');

    // Trigger update via hook
    act(() => {
      getByTestId('btn').click();
    });

    // Should re-render and show new value
    expect(state.user.name).toBe('Jane');
    expect(lastRenderedValue).toBe('Jane');
    expect(getByTestId('btn').textContent).toBe('Jane');
  });

  test('should cancel pending update on unmount', () => {
    jest.useFakeTimers();

    const TestComponent = observer(() => {
      const { onChangeValue } = useStatePathInput({
        state,
        path: 'user.name',
        debounce: 500,
        getValueToSet: (v) => v
      });
      return <div onClick={() => onChangeValue('Jane')}>Click Me</div>;
    });

    const { getByText, unmount } = render(<TestComponent />);

    // Trigger change
    act(() => {
      getByText('Click Me').click();
    });

    // Unmount before timer ends
    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // State should NOT be updated
    expect(state.user.name).toBe('John');

    jest.useRealTimers();
  });

  test('should work correctly with real HTML input elements', () => {
    const TestComponent = observer(() => {
      const { value, onChangeValue } = useStatePathInput({ state, path: 'user.name' });
      return (
        <input
          data-testid="input"
          value={value || ''}
          onChange={onChangeValue}
        />
      );
    });

    const { getByTestId } = render(<TestComponent />);
    const input = getByTestId('input');

    // Simulate real user typing
    act(() => {
      fireEvent.change(input, { target: { value: 'Jane' } });
    });

    expect(state.user.name).toBe('Jane');
    expect(input.value).toBe('Jane');
  });

  test('should only commit the last value and arguments during rapid changes', () => {
    jest.useFakeTimers();
    const onChangeStateAtPath = jest.fn();

    const TestComponent = observer(() => {
      const { onChangeValue } = useStatePathInput({
        state,
        path: 'user.name',
        debounce: 100,
        onChangeStateAtPath,
        getValueToSet: (v) => v
      });
      return (
        <div>
          <button data-testid="b1" onClick={() => onChangeValue('A', 'metaA')}>A</button>
          <button data-testid="b2" onClick={() => onChangeValue('B', 'metaB')}>B</button>
        </div>
      );
    });

    const { getByTestId } = render(<TestComponent />);

    act(() => {
      getByTestId('b1').click(); // First call
    });

    act(() => {
      jest.advanceTimersByTime(50); // 50ms passed (not yet debounced)
      getByTestId('b2').click();    // Second call (should cancel first)
    });

    act(() => {
      jest.advanceTimersByTime(100); // 150ms total, 100ms since B
    });

    expect(state.user.name).toBe('B');
    expect(onChangeStateAtPath).toHaveBeenCalledTimes(1);
    // Should call with the metadata from the SECOND call
    expect(onChangeStateAtPath).toHaveBeenCalledWith(state, 'user.name', 'B', 'metaB');

    jest.useRealTimers();
  });

  test('should cancel pending update when path prop changes mid-debounce', () => {
    jest.useFakeTimers();

    const TestComponent = observer(({ currentPath }) => {
      const { onChangeValue } = useStatePathInput({
        state,
        path: currentPath,
        debounce: 500,
        getValueToSet: (v) => v
      });
      return <button data-testid="btn" onClick={() => onChangeValue('DraftValue')}>Click</button>;
    });

    const { getByTestId, rerender } = render(<TestComponent currentPath="user.name" />);

    act(() => {
      getByTestId('btn').click(); // Pending update for user.name
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Suddenly change path to 'user.other'
    rerender(<TestComponent currentPath="user.other" />);

    act(() => {
      jest.advanceTimersByTime(500); // Original debounce would have finished
    });

    // user.name should STAY as 'John' because the update was cancelled
    expect(state.user.name).toBe('John');
    expect(state.user.other).toBeUndefined(); // Nothing should happen to the new path either

    jest.useRealTimers();
  });
});
