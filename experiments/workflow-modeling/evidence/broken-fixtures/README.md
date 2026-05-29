# Broken fixtures

Copie dei due esempi corretti con errori volutamente introdotti, una per regola Error che vogliamo verificare.

Ogni fixture porta in cima un commento che dichiara la regola Error che si aspetta di vedere scattare. Il validatore deve trovare quell'errore e, idealmente, solo quello (al netto degli effetti a cascata, ad esempio una transizione orfana che cita uno stato inesistente conta come singolo errore E014).

Convenzione di naming:

```
<workflow>.broken-<rule>-<keyword>.yaml
```

I report di validazione delle fixture finiscono accanto al file YAML con suffisso `.validation.md`. Il comando atteso fallisce (exit code 1), il che è il *risultato voluto* per dimostrare che il validatore non passa silenziosamente input non validi.
