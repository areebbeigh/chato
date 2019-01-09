# chato
Chato is a simple NodeJS web app for peer-to-peer video and/or text communication between browsers using WebSocket and WebRTC.

<details><summary>Unsolicited preview with my face (you might not wanna see this)</summary>
  <p>
    
  ![Screenshot](https://github.com/areebbeigh/chato/blob/master/Screenshot_20190109_150514.png)
  </p>
</details>

### What's being used

- Express
- Socket.IO
- WebRTC
- Materialize CSS
- ClipboardJS

### Get it up and running
Browsers allow camera/mic access only over HTTPS and localhost so you can't test chato on two devices locally unless you go through the pain of creating a fake https certificate for the network. You can however test it on localhost in two separate browser instances (or tabs). You can also check it out at https://letschato.herokuapp.com. Don't worry, I'm not peeking. :grin:

`npm start` - All the magic.

### Contributing
This is a pretty simple application. However, if you do find something to improve/add go ahead and create an issue and we can discuss it. :smile:

Cheers :coffee:
