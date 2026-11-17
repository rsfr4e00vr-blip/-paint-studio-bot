"""Multiplayer accepts and synchronizes the detailed 3000-province map."""
import asyncio
import nations_server as ns

class FakeSocket:
    def __init__(self): self.messages=[]
    async def send_json(self,payload): self.messages.append(payload)

async def run():
    room=ns.Room('PROVINCES')
    room.state='running'
    a=ns.Player(FakeSocket(),'a','Игрок А','Альфа')
    b=ns.Player(FakeSocket(),'b','Игрок Б','Бета')
    room.players={a.id:a,b.id:b}
    a_regions=[{'id':f'AL:{i}','name':f'Область · провинция {i+1}'} for i in range(3000)]
    b_regions=[{'id':f'BE:{i}','name':f'Регион · провинция {i+1}'} for i in range(3000)]
    await ns.on_report(room,a,{'rep':{'gdp':42000,'money':10000,'pop':1000000},'regions':a_regions})
    await ns.on_report(room,b,{'rep':{'gdp':42000,'money':10000,'pop':1000000},'regions':b_regions})
    assert len(a.regions)==3000 and len(b.regions)==3000
    room.wars['w1']={'id':'w1','a':a.id,'d':b.id,'p':50,'m':0,'attacks':[]}
    a.war=b.war='w1'
    pub=room.war_pub(room.wars['w1'])
    assert len(pub['regions'][a.id])==3000 and len(pub['regions'][b.id])==3000
    print('OK: multiplayer server accepts 3000 provinces per player and includes them in the shared war snapshot')

if __name__=='__main__': asyncio.run(run())
