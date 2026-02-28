const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const { makeAutoObservable, toJS } = require('mobx');
const useStatePathInput = require('../use-state-path-input');
const _ = require('lodash');

describe('useStatePathInput', () => {
  let state;

  beforeEach(() => {
    state = makeAutoObservable({
      user: {
        name: 'John',
        address: {
          city: 'Seoul'
        }
      },
      count: 0
    });
  });

  test('should return current value from state and path', () => {
    const { result } = renderHook(() =>
      useStatePathInput({ state, path: 'user.name' })
    );

    expect(result.current.value).toBe('John');
  });

  test('should handle deep paths', () => {
    const { result } = renderHook(() =>
      useStatePathInput({ state, path: 'user.address.city' })
    );

    expect(result.current.value).toBe('Seoul');
  });

  test('should support function-based state and path', () => {
    const { result } = renderHook(() =>
      useStatePathInput({
        state: () => state,
        path: () => 'user.name'
      })
    );

    expect(result.current.value).toBe('John');
  });

  test('should update value and target when path changes', () => {
    const { result, rerender } = renderHook(
      ({ path }) => useStatePathInput({ state, path, getValueToSet: (v) => v }),
      { initialProps: { path: 'user.name' } }
    );

    expect(result.current.value).toBe('John');

    // Change path to 'count'
    rerender({ path: 'count' });
    expect(result.current.value).toBe(0);

    // Update via new path
    act(() => {
      result.current.onChangeValue(99);
    });

    rerender({ path: 'count' });
    expect(state.count).toBe(99);
    expect(result.current.value).toBe(99);
  });

  test('should return undefined for non-existent path and create it on update', () => {
    const { result, rerender } = renderHook(() =>
      useStatePathInput({
        state,
        path: 'new.deep.path',
        getValueToSet: (v) => v
      })
    );

    expect(result.current.value).toBeUndefined();

    act(() => {
      result.current.onChangeValue('new value');
    });

    rerender();
    expect(state.new.deep.path).toBe('new value');
    expect(result.current.value).toBe('new value');
  });

  test('should update state when onChangeValue is called', () => {
    const { result, rerender } = renderHook(() =>
      useStatePathInput({
        state,
        path: 'user.name',
        getValueToSet: (v) => v
      })
    );

    act(() => {
      result.current.onChangeValue('Jane');
    });

    rerender();

    expect(state.user.name).toBe('Jane');
    expect(result.current.value).toBe('Jane');
  });

  test('should extract value from event object', () => {
    const { result } = renderHook(() =>
      useStatePathInput({ state, path: 'user.name' })
    );

    const mockEvent = {
      target: { value: 'Jane from event' },
      persist: jest.fn()
    };

    act(() => {
      result.current.onChangeValue(mockEvent);
    });

    expect(state.user.name).toBe('Jane from event');
    expect(mockEvent.persist).toHaveBeenCalled();
  });

  test('should handle custom getValueToSet', () => {
    const { result } = renderHook(() =>
      useStatePathInput({
        state,
        path: 'count',
        getValueToSet: (v) => v + 1
      })
    );

    act(() => {
      result.current.onChangeValue(10);
    });

    expect(state.count).toBe(11);
  });

  test('should support debouncing', async () => {
    jest.useFakeTimers();

    const { result, rerender } = renderHook(() =>
      useStatePathInput({
        state,
        path: 'user.name',
        debounce: 500,
        getValueToSet: (v) => v
      })
    );

    act(() => {
      result.current.onChangeValue('Jane');
    });

    // Should not update immediately
    expect(state.user.name).toBe('John');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    rerender();

    expect(state.user.name).toBe('Jane');
    expect(result.current.value).toBe('Jane');

    jest.useRealTimers();
  });

  test('should call onChangeStateAtPath after update', () => {
    const onChangeStateAtPath = jest.fn();
    const { result } = renderHook(() =>
      useStatePathInput({
        state,
        path: 'user.name',
        onChangeStateAtPath,
        getValueToSet: (v) => v
      })
    );

    act(() => {
      result.current.onChangeValue('Jane', 'extra');
    });

    expect(state.user.name).toBe('Jane');
    expect(onChangeStateAtPath).toHaveBeenCalledWith(state, 'user.name', 'Jane', 'extra');
  });

  test('should handle multiple arguments in onChangeValue', () => {
    const onChangeStateAtPath = jest.fn();
    const { result } = renderHook(() =>
      useStatePathInput({
        state,
        path: 'user.name',
        onChangeStateAtPath,
        getValueToSet: (v) => v
      })
    );

    act(() => {
      result.current.onChangeValue('Jane', 'arg2', 'arg3');
    });

    expect(state.user.name).toBe('Jane');
    expect(onChangeStateAtPath).toHaveBeenCalledWith(state, 'user.name', 'Jane', 'arg2', 'arg3');
  });
});
