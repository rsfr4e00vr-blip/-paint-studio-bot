# -*- coding: utf-8 -*-
"""Генерирует world.json и world_data.js (195 стран) из world_src.py + ISO-списков + CLDR-названий.
Запуск: python tools/build_world.py   (нужен пакет babel; исходные данные лежат в world_src.py)"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import world_src as W
from babel import Locale

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ISO = json.load(open('/usr/share/iso-codes/json/iso_3166-1.json', encoding='utf-8'))['3166-1'] if os.path.exists('/usr/share/iso-codes/json/iso_3166-1.json') else []
NUM = {x['alpha_2']: int(x['numeric']) for x in ISO}
A3 = {x['alpha_2']: x['alpha_3'] for x in ISO}
RU = Locale('ru').territories
OVR = {'BY':'Беларусь','CZ':'Чехия','MM':'Мьянма','SZ':'Эсватини','CV':'Кабо-Верде','TL':'Восточный Тимор','MK':'Северная Македония',
       'KP':'КНДР','KR':'Южная Корея','CD':'ДР Конго','CG':'Республика Конго','CI':'Кот-д’Ивуар','US':'США','GB':'Великобритания',
       'AE':'ОАЭ','VA':'Ватикан','PS':'Палестина','FM':'Микронезия','KN':'Сент-Китс и Невис','VC':'Сент-Винсент и Гренадины',
       'ST':'Сан-Томе и Принсипи','BA':'Босния и Герцеговина','TT':'Тринидад и Тобаго','AG':'Антигуа и Барбуда','PG':'Папуа — Новая Гвинея',
       'RU':'Россия','UA':'Украина','TR':'Турция','LA':'Лаос','SY':'Сирия','IR':'Иран','VN':'Вьетнам','TZ':'Танзания','MD':'Молдова','BN':'Бруней','GM':'Гамбия','BS':'Багамы'}
# центры стран для маркеров: среднее по часовым зонам + ручные правки для огромных стран
CENTER = {'US':(39,-98),'RU':(58,60),'CN':(35,103),'CA':(56,-96),'BR':(-10,-52),'AU':(-25,134),'ID':(-2,118),'KZ':(48,67),'MX':(23,-102),
          'AR':(-34,-64),'CD':(-2,23),'MN':(47,103),'IN':(21,79),'CL':(-30,-71),'UA':(49,31),'FR':(46.5,2.5),'NO':(61,9),'JP':(36,138),
          'NZ':(-42,173),'EC':(-1.5,-78.5),'PT':(39.5,-8),'ES':(40,-3.5),'GB':(54,-2),'DK':(56,10),'FM':(6.9,158),'KI':(1.9,-157),'SA':(24,45),
          'EG':(27,30),'DZ':(28,2),'LY':(27,17),'SD':(15,30),'TD':(15,19),'NE':(17,9),'ML':(17,-3),'MR':(20,-10),'ZA':(-29,24),'AO':(-12,17),
          'ET':(9,40),'IR':(32,53),'TR':(39,35),'AF':(34,66),'PK':(30,70),'MM':(21,96),'TH':(15,101),'VN':(16,107),'PH':(12,122),'MY':(4,102)}

def dm(s):
    sign = 1 if s[0] == '+' else -1; s = s[1:]
    if len(s) in (4, 5):  # DDMM or DDDMM
        d = int(s[:-2]); m = int(s[-2:]); return sign * (d + m / 60)
    d = int(s[:-4]); m = int(s[-4:-2]); sec = int(s[-2:]); return sign * (d + m / 60 + sec / 3600)

def zones():
    pts = {}
    for line in open('/usr/share/zoneinfo/zone1970.tab', encoding='utf-8'):
        if line.startswith('#') or not line.strip(): continue
        cc, coord = line.split('\t')[:2]
        import re
        m = re.match(r'([+-]\d+)([+-]\d+)', coord)
        lat, lon = dm(m.group(1)), dm(m.group(2))
        for c in cc.split(','): pts.setdefault(c, []).append((lat, lon))
    return pts
Z = zones()

def power(iso, gdp, pop):
    if iso in W.POWER: return W.POWER[iso]
    p = 6 + 13 * math.log10(1 + gdp) + 3 * math.log10(1 + pop)
    return max(4, min(60, round(p)))

# Реальные области Новарии (восток и юг Украины + часть Белгородской области, как на карте игры)
NOVARIA = [
 {'id':'kharkiv','ru':'Харьковская область','lat':49.99,'lon':36.23,'pop':2.5,'res':{'y':3,'g':3,'e':1},'note':'Газ (Шебелинка), зерно, машиностроение','geo':'kharkiv'},
 {'id':'luhansk','ru':'Луганская область','lat':48.57,'lon':39.31,'pop':1.0,'res':{'c':4,'o':1,'g':2},'note':'Уголь, нефтепереработка, химия','geo':'luhans'},
 {'id':'donetsk','ru':'Донецкая область','lat':48.02,'lon':37.80,'pop':3.2,'res':{'c':5,'e':3,'o':1,'y':1},'note':'Уголь Донбасса, сталь, топливо','geo':'donets'},
 {'id':'dnipro','ru':'Днепропетровская область','lat':48.46,'lon':35.04,'pop':3.0,'res':{'g':4,'e':5,'c':1},'note':'Пшеница, железо и марганец Кривого Рога','geo':'dnipro'},
 {'id':'zaporizhzhia','ru':'Запорожская область','lat':47.84,'lon':35.14,'pop':1.6,'res':{'g':4,'e':2,'y':2},'note':'Зерно, металлургия, АЭС','geo':'zaporiz'},
 {'id':'kherson','ru':'Херсонская область','lat':46.64,'lon':32.62,'pop':1.0,'res':{'g':4},'note':'Зерно, овощи, рыба','geo':'kherson'},
 {'id':'mykolaiv','ru':'Николаевская область','lat':46.97,'lon':31.99,'pop':1.1,'res':{'g':3,'e':1},'note':'Зерно, судостроение, порты','geo':'mykola'},
 {'id':'odesa','ru':'Одесская область','lat':46.48,'lon':30.73,'pop':2.3,'res':{'g':3,'o':1},'note':'Порты, зерно, нефтеналивной терминал','geo':'odes'},
 {'id':'crimea','ru':'Крым','lat':45.30,'lon':34.40,'pop':2.4,'res':{'y':3,'g':2,'e':1},'note':'Шельфовый газ, зерно, соль','geo':'crim'},
 {'id':'belgorod','ru':'Белгородская область (частично)','lat':50.60,'lon':36.59,'pop':1.5,'res':{'e':4,'g':3},'note':'Железная руда КМА, зерно','geo':'belgorod'},
]

def main():
    out = []
    for iso, (cont, pop, gdp, res) in sorted(W.D.items(), key=lambda kv: -kv[1][2]):
        pts = Z.get(iso, [])
        lat, lon = CENTER.get(iso) or ((sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)) if pts else (0, 0))
        out.append({'i': iso, 'a': A3.get(iso, ''), 'n': NUM.get(iso, 0), 'ru': OVR.get(iso) or RU.get(iso, iso), 'c': cont,
                    'p': pop, 'g': gdp, 'm': power(iso, gdp, pop), 'r': res, 'lat': round(lat, 2), 'lon': round(lon, 2),
                    't': W.TRAIT.get(iso, '')})
    data = {'countries': out, 'novaria': NOVARIA, 'neighbors': W.NEIGHBORS}
    json.dump(data, open(os.path.join(ROOT, 'world.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(ROOT, 'world_data.js'), 'w', encoding='utf-8').write('window.WORLD_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(len(out), 'countries')
if __name__ == '__main__': main()
