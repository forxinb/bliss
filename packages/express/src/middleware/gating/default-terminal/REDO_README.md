# Default Terminal

범용적으로 사용할 수 있는 기본 터미널 설정입니다.

## Gate Definitions 구조

gate-defs는 **3단계 중첩 구조**를 사용합니다:

```javascript
const gateDefs = {
  'firstPath': {               // 첫 번째 경로 레벨
    'lastPath': {              // 마지막 경로 레벨
      'method': {              // HTTP 메서드
        schema: yourSchema,
        formPath: 'optional',
        paramsToForm: {}
      }
    }
  }
};
```

### 사용 예시
```javascript
const gateDefs = {
  '/users': {                  // firstPath: Domain
    '/:userId': {              // lastPath: Resource
      'GET': { schema: userSchema }
    }
  }
};
```

자세한 내용은 [`dev-docs/concepts/gate-def-structure.md`](../../../../dev-docs/concepts/gate-def-structure.md)를 참고하세요.

## 구조

```
default-terminal-def/
├── error-defs/          # 에러 정의
│   ├── request.js       # HTTP 요청 관련 에러
│   └── system.js        # 시스템/프레임워크 에러
├── success-defs/        # 성공 응답 정의
│   └── request.js       # 기본 성공 응답
├── gates/              # 게이트 정의
│   ├── post.js         # 포스트 관련 게이트
│   └── like.js         # 좋아요 관련 게이트
└── index.js            # 통합 export
```

## 사용법

### 1. 기본 사용
```javascript
const defaultTerminalDef = require('./default-terminal-def');

const { errorDefs, successDefs, gateDefs } = defaultTerminalDef;

// 에러 사용
res.gate.error('request.bad');        // 400 에러
res.gate.error('system.unknown');     // 500 에러

// 성공 응답 사용
res.gate.success('request.ok', data); // 200 응답
```

### 2. 커스텀 에러 사용
```javascript
// 함수형 정의 사용
const validationError = errors.request.validationError({ 
  error: 'Invalid email format' 
});
// 결과: { type: 'request', name: 'validationError', code: 400, error: 'Invalid email format' }
```

### 3. 프로젝트별 확장
```javascript
// 프로젝트별 terminal 생성
const defaultTerminalDef = require('./default-terminal-def');
const { errorDefsFromRaw, successDefsFromRaw } = require('../gating');

const customRawErrorDefs = {
  ...defaultTerminalDef.errorDefs,
  auth: {
    unauthorized: { code: 401 },
    forbidden: { code: 403 }
  }
};

const customErrorDefs = errorDefsFromRaw(customRawErrorDefs);
```

## 에러 정의

### request 에러
- `bad`: 400 - 잘못된 요청
- `validationError`: 400 - 유효성 검사 실패 (함수형)
- `notFound`: 404 - 리소스 없음
- `conflict`: 409 - 충돌

### system 에러
- `unknown`: 500 - 알 수 없는 에러
- `transactionError`: 500 - 트랜잭션 에러
- `paginationError`: 500 - 페이지네이션 에러
- `illegalFunctionCall`: 500 - 잘못된 함수 호출
- `gateNotFound`: 500 - 게이트 없음
- `gateError`: 500 - 게이트 에러
- `collectionNotFound`: 500 - 컬렉션 없음

## 성공 정의

### request 성공
- `ok`: 200 - 성공

## 에러 처리 시스템

### 정적 에러 vs 동적 에러

#### 정적 에러 (직접 호출)
```javascript
// 고정된 에러 메시지 - 시스템 에러, 고정된 비즈니스 규칙 위반
next(Error.system.gateError);
next(Error.system.gateNotFound);
next(Error.request.bad);
next(Error.request.notFound);
next(Error.request.conflict);
```

#### 동적 에러 (함수 호출)
```javascript
// 추가 데이터가 필요한 에러 - 사용자 입력 검증, 동적 메시지가 필요한 경우
next(Error.request.validationError({ error: validationDetails }));
```

### 사용 가이드

#### 정적 에러 사용 시점
- **시스템 에러**: 게이트 찾기 실패, 스키마 오류 등
- **고정된 비즈니스 규칙**: 권한 없음, 리소스 없음 등
- **표준 HTTP 에러**: 400, 404, 409 등

#### 동적 에러 사용 시점
- **사용자 입력 검증**: 폼 데이터 검증 실패 시 구체적인 오류 메시지
- **커스텀 메시지**: 비즈니스 로직에 따른 동적 에러 메시지
- **디버깅 정보**: 개발/운영 환경에 따른 상세 오류 정보

### 예시

```javascript
// 정적 에러 예시
if (!gate) {
  next(Error.system.gateNotFound);  // 고정된 500 에러
}

// 동적 에러 예시
try {
  schema.validate(form);
} catch (error) {
  next(Error.request.validationError({ error }));  // 동적 400 에러
}
```
