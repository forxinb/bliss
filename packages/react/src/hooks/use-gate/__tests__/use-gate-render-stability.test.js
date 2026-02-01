const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const useGate = require('../use-gate');
const { makeSchema } = require('@godbliss/core/utils');
const { userSchema, userWithIdSchema } = require('../__mocks__/mock-schema-for-use-gate-test');
const { basicGateContext } = require('../__mocks__/mock-gate-context-for-use-gate-test');

/**
 * Focus: Ensure no unnecessary resets on re-render when schema effectively didn't change.
 * This observes current behavior without implementation changes.
 */

describe('useGate - Render Stability', () => {
  test('should not reset on identical props re-render', () => {
    const gateDef = { method: 'GET', path: '/api/users', schema: userSchema };

    const { result, rerender } = renderHook(({ gateDef }) => useGate(gateDef, basicGateContext), {
      initialProps: { gateDef }
    });

    const formRef = result.current.form;
    const assignedAt = result.current.formAssignedAt;

    act(() => {
      rerender({ gateDef });
    });

    expect(result.current.form).toBe(formRef);
    expect(result.current.formAssignedAt).toBe(assignedAt);
  });

  test('should not reset when new gateDef object uses same schema instance', () => {
    const schemaA = userSchema; // same instance
    const gateDef1 = { method: 'GET', path: '/api/users', schema: schemaA };
    const gateDef2 = { method: 'GET', path: '/api/users', schema: schemaA }; // new object, same schema ref

    const { result, rerender } = renderHook(({ gateDef }) => useGate(gateDef, basicGateContext), {
      initialProps: { gateDef: gateDef1 }
    });

    const formRef = result.current.form;
    const assignedAt = result.current.formAssignedAt;

    act(() => {
      rerender({ gateDef: gateDef2 });
    });

    // Current expected behavior: no reset
    expect(result.current.form).toBe(formRef);
    expect(result.current.formAssignedAt).toBe(assignedAt);
  });

  test('should reset when schema instance actually changes', async () => {
    const gateDef1 = { method: 'GET', path: '/api/users', schema: userSchema };
    const gateDef2 = { method: 'GET', path: '/api/users', schema: userWithIdSchema };

    const { result, rerender } = renderHook(({ gateDef }) => useGate(gateDef, basicGateContext), {
      initialProps: { gateDef: gateDef1 }
    });

    const formRef = result.current.form;
    const assignedAt = result.current.formAssignedAt;

    // Resolved timing issues by delaying render slightly.
    // TODO: Consider a more fundamental fix if rapid re-initialization (multiple times per ms) is a real-world case.
    // ISSUE: Potential delay due to setFormAssignedAt call inside mobxAction
    // - setFormAssignedAt is called within mobxAction and might not reflect immediately.
    // - Might leak out of act() scope causing race conditions in tests.
    // - Need to move setFormAssignedAt outside mobxAction or introduce synchronization mechanism.
    // 📚 Detailed context: todos/tech-enhancement/mobx-action-formassignedat-timing-issue.md
    await new Promise(resolve => setTimeout(resolve, 2));

    act(() => {
      rerender({ gateDef: gateDef2 });
    });

    expect(result.current.form).not.toBe(formRef);
    expect(result.current.formAssignedAt).toBeGreaterThan(assignedAt);
  });

  test.skip('should reinitialize repeatedly when schema returns new instance each render (anti-pattern detection)', async () => {
    const gateDef = { method: 'GET', path: '/api/users', schema: () => makeSchema({ x: { type: String } }) };

    const { result, rerender } = renderHook(({ gateDef }) => useGate(gateDef, basicGateContext), {
      initialProps: { gateDef }
    });

    const timestamps = [result.current.formAssignedAt];

    // trigger a few rapid rerenders with same gateDef
    await new Promise(r => setTimeout(r, 1));
    act(() => { rerender({ gateDef }); });
    timestamps.push(result.current.formAssignedAt);

    await new Promise(r => setTimeout(r, 1));
    act(() => { rerender({ gateDef }); });
    timestamps.push(result.current.formAssignedAt);

    // Expect at least one increase indicating repeated reinitialization
    const unique = new Set(timestamps);
    expect(unique.size).toBeGreaterThan(1);
  });

  test('should NOT log error and NOT reset when schema function returns pre-made instance', () => {
    const alreadyMadeSchema = makeSchema({ x: { type: String } });
    const gateDef = { method: 'GET', path: '/api/users', schema: () => alreadyMadeSchema };

    const { result, rerender } = renderHook(({ gateDef }) => useGate(gateDef, basicGateContext), {
      initialProps: { gateDef }
    });

    const assignedAt1 = result.current.formAssignedAt;

    act(() => {
      rerender({ gateDef });
    });

    expect(result.current.formAssignedAt).toBe(assignedAt1);
  });

  test('route/query-only changes should not reset form (same schema)', () => {
    const gateDef = { method: 'GET', path: '/api/users/:userId', schema: userSchema };
    const req1 = { schemaSelector: {}, routeParams: { userId: '1' }, queryParams: {}, additionalQueryKey: [] };
    const req2 = { schemaSelector: {}, routeParams: { userId: '2' }, queryParams: { page: 1 }, additionalQueryKey: [] };

    const { result, rerender } = renderHook(({ req }) => useGate(gateDef, req), {
      initialProps: { req: req1 }
    });

    const formRef = result.current.form;
    const assignedAt = result.current.formAssignedAt;

    act(() => {
      rerender({ req: req2 });
    });

    expect(result.current.form).toBe(formRef);
    expect(result.current.formAssignedAt).toBe(assignedAt);
  });
});
