# Relatorio de progressao - java

- Usuario: java.progression@teste.local
- Total de execucoes: 9
- Primeiro arquivo com detectedRole=Pleno: pleno_iniciante.java
- Primeiro arquivo com detectedRole=Senior: senior_iniciante.java

## Execucoes

### 1. junior_iniciante.java

- inputRole: Junior
- appliedRole: Junior
- detectedRole: Junior
- stateDetectedLevel: Junior
- targetLevelStatus: at_expected
- promotionReadiness: not_ready
- nextRole: Pleno
- status HTTP: 200
- resultado: ok
- resposta bruta: raw\java-01-junior_iniciante.java.json

### 2. junior_medio.java

- inputRole: Junior
- appliedRole: Junior
- detectedRole: Junior
- stateDetectedLevel: Junior
- targetLevelStatus: below_expected
- promotionReadiness: getting_close
- nextRole: Pleno
- status HTTP: 200
- resultado: ok
- resposta bruta: raw\java-02-junior_medio.java.json

### 3. junior_avancado.java

- inputRole: Junior
- appliedRole: Junior
- detectedRole: Junior
- stateDetectedLevel: Junior
- targetLevelStatus: above_expected
- promotionReadiness: getting_close
- nextRole: Pleno
- status HTTP: 200
- resultado: ok
- resposta bruta: raw\java-03-junior_avancado.java.json

### 4. pleno_iniciante.java

- inputRole: Junior
- appliedRole: Junior
- detectedRole: Pleno
- stateDetectedLevel: Pleno
- targetLevelStatus: above_expected
- promotionReadiness: ready
- nextRole: Senior
- status HTTP: 200
- resultado: ok
- resposta bruta: raw\java-04-pleno_iniciante.java.json

### 5. pleno_medio.java

- inputRole: Pleno
- appliedRole: Pleno
- detectedRole: Pleno
- stateDetectedLevel: Pleno
- targetLevelStatus: at_expected
- promotionReadiness: getting_close
- nextRole: Senior
- status HTTP: 200
- resultado: ok
- resposta bruta: raw\java-05-pleno_medio.java.json

### 6. pleno_avancado.java

- inputRole: Pleno
- appliedRole: n/d
- detectedRole: n/d
- stateDetectedLevel: n/d
- targetLevelStatus: n/d
- promotionReadiness: n/d
- nextRole: n/d
- status HTTP: 500
- resultado: Gemini API error (400): {"error":{"message":"Request blocked due to copyright/recitation content. Please modify your input and retry.","code":"The generated content was filtered because it may contain material that resembles existing copyrighted works. Try rephrasing the prompt. If you think this was an error, [send feedback](https://ai.google.dev/gemini-api/docs/troubleshooting)."}}
- resposta bruta: raw\java-06-pleno_avancado.java.json

### 7. senior_iniciante.java

- inputRole: Pleno
- appliedRole: Pleno
- detectedRole: Senior
- stateDetectedLevel: Senior
- targetLevelStatus: above_expected
- promotionReadiness: ready
- nextRole: n/d
- status HTTP: 200
- resultado: ok
- resposta bruta: raw\java-07-senior_iniciante.java.json

### 8. senior_medio.java

- inputRole: Senior
- appliedRole: Senior
- detectedRole: Senior
- stateDetectedLevel: Senior
- targetLevelStatus: at_expected
- promotionReadiness: not_applicable
- nextRole: n/d
- status HTTP: 200
- resultado: ok
- resposta bruta: raw\java-08-senior_medio.java.json

### 9. senior_avancado.java

- inputRole: Senior
- appliedRole: Senior
- detectedRole: Senior
- stateDetectedLevel: Senior
- targetLevelStatus: at_expected
- promotionReadiness: not_applicable
- nextRole: n/d
- status HTTP: 200
- resultado: ok
- resposta bruta: raw\java-09-senior_avancado.java.json
