# Page snapshot

```yaml
- generic [ref=e3]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e7]:
    - generic [ref=e9]: sonatel
    - generic [ref=e11]:
      - paragraph [ref=e12]: Bienvenue sur G-SECU
      - heading "Se connecter" [level=1] [ref=e13]
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: Identifiant ou Email
        - textbox "prenom.nom@sonatel.sn" [ref=e17]
      - generic [ref=e18]:
        - generic [ref=e19]: Mot de passe
        - textbox "••••••••" [ref=e20]
      - link "Mot de passe oublié ?" [ref=e22] [cursor=pointer]:
        - /url: /forgot-password
      - button "SE CONNECTER" [ref=e23] [cursor=pointer]
    - generic [ref=e26]: En ligne
    - paragraph [ref=e27]:
      - text: © 2026 Direction de la sécurité
      - text: Sonatel DG/SECU
```