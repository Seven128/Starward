(function () {
  "use strict";

  const root = document.getElementById("phone-root");
  const phone = document.getElementById("phone");
  const announcer = document.getElementById("announcer");
  const surfaceSelect = document.getElementById("surface-select");
  const routeSelect = document.getElementById("route-select");
  const stateSelect = document.getElementById("state-select");
  const auditCurrent = document.getElementById("audit-current");
  const EAST_LINGSHAN_IMAGE = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAsHCAkIBwsJCQkMCwsNEBoREA8PECAXGBMaJiIoKCYiJSQqMD0zKi05LiQlNUg1OT9BREVEKTNLUEpCTz1DREH/2wBDAQsMDBAOEB8RER9BLCUsQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUH/wAARCAEsAeADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD0Fuv4D+VNpzDkfQUmKBBRilApcYoAZRmnGmGgAJpM00mmlqYDi1JuqMtTS1AE2/FKHFV91N380AW8g0m6oA/vRvoAlLUb6hL0m+gCbfRvqBnFN8ygCxvpQ9VfMpwegCxupwaq++lD0AWAaUNUG+l30gJ91G6q/mUu+mBY3Uu6q++jf70AWN1G6oPMpN9ICfdTS9Ql6aXoAmL0heoDJTS9AE5eml6hL00yUATF6bvqAv70m+gCxvo31X8yjzKALG+l31W8yl8ygCVjTCaZvoL0AKWphakJzTTQAu6k3UZphNADt1NLUwtSFqAHFqYTTS1JuoAUtSZpuaTNMBxakzSUlAC5ozTaUUDHZpV5YU0VIg+YUAdY6jP4D+VJtpzHn8B/KkpAN20EU+kNAiNhUbVIxqNqYEbUw1IaYaBDDTDT2NMY0AMNNJpWNMJoANxo30xjTC1AE2+mmSoi1NLUASGQ0nmGoi1GaAJt9Hme9QZpQ1MCwHp4f3qsGxS76QFoP70u+qu+l8zFAFnfRuqt5lL5lAFnzKTzPeq3mU0yH1oGWvN96XzPeqfmUeZx1oEWjLTTLVUyc9aQyUAWTLTfMqvvpN9AywZKQvUBek30xE2+k31Bvo30DJ99G+q++jfSAsb6N9V99HmUxFjfRvqv5lHmUrDuWN9G+oPMpN9FgJy1NLVHvFNLcUWAcTSGmbqN1MQE0hNBNNNAxc0uaZmjNAD80tM3UbqAH0AU0GlBoAkUCnL94UxTUifeFAHUOefwH8qQNTHbn8B/Ko99SBY3U0tUG80u+gB7NUbNSM1MLUxDi1MLUhamk0ABNMbmlJphagBGxUbEChmqNmpiBmqMmgmmk0DAmmk0E00mgVxc0m6mMaYWoAlL0B6hJpNxoAsb6XfVbeRTlc0WAsb6TfUG+nqCadgH76N9AjJpwgY9AaQXGl6QvUotnxnFKbVsZAp2C5X30hc1aSwldgApqV9OaM4PNAGeWNLuNWvspB6VNBpskxwBQBnbjRuNar6PKq5xVWWwdBnFAFPdSbqe8LDtUTIwoAXdRvpmDRg0WGO30bqbtNG1vegLjt1JupNrUbWoAXdRupNppNppWAfupQ1NCN6VIkbEjiiwCc0oBNWUgyOlSCACgCmEPpRtOKuiIU1ogO1AFEg5oxVgx800x4FMCDbRipdtAjPpSAiC0oU1MsLHtUi27GmBXCGnrHV6LT3YZxVqPSpPSgRlrEamihJYYHetWLTCCMirsOnIGAx3oGVnPP4Cm8mpfLy4+gqwtocdKkZUVCeacUNW/J2CoihpAVGXmmlasOpFQsDTEQtxTCalZT6VGUOelMBtJtzUgjPpUixE0CKrRZqNoWz0rRWHFL5Y9KBmQ8bDtUbKRW00SHqKje2jbtQIxiDTCprYNknaonsz2oAyyp9KbtNaYs29Ketmv8WKYGT5belJ5THtWyLWMe9O+zxKc7T+VAjF8l/Q09baQ9Aa2dsYGAv6UqsF7CmMzIrCVv4TVqLTpPSryyk1PG+RSuFiCHTgAN1WY7VEGAAakVsinpkngUhkLWqelIlsuelXNmetOEYouOxCsGOmKPsobqOatotSIopXCxTGnREDIqeC2SLoKsYAoxSuFiNo1YYIqvJaKx6CrmKSgZj3GkK/K1SfRj6V0ppNoPancVjlDo756U+PRWOC1dRsX0pdq+lPmFY5v+xMrkCmjRW9K6QgCkxSuOxzw0U91pw0MnoK36dnijmYWOfGgt3FNOhMOmK6HNGaLsLI53+yDGcMKa1iqdq6B1LjFQPbZHrTuKxhNEF6UwrWq9izEgCmjTXzzigDLCe1Bjz2rYXTyOopTYHHAoAwzATTfs7HtW5/Z7Y7ZoGntnoMUwMRbRielWoNMdsZXitqKxxjKiraQhQKVwsYyaX7VYj01ARkVqYFLilcdimloFqQRDHSrBHFNGBRcLEYj9qkWMDFLuA60oYE0hkDQJnO0ZwKcPlGKcQP0pMUARuuTTDCKm2ilwKAKht896abQE9au4AGTgD1NZ93q9pbghT5zDsnQfjQJkgsx3NH2FO9Zo8Qv18iP/vo0kfiFwx8yJGHopIIp2YuZGstnGPeniCP+6KzG8QQlcxwMTnu3FUrjXbtmxHtiH+yMn8zQF0dAbeMjoKj+zoTgEZHauXuLyeVSZrhm9ATUUd9JCDslZN3XaeTQkLmOraz3HJPFQbbXf5f2iLd6bhXLG7JXcWYqfU0n2gdzVcouY6pordXEbTxq7HAXdzTzYe/NcoJiORxj0rTTxFPBCkbRCZweXc9R6cd/ejlfQal3Ncad6tTxp6KeMH61iP4lu2ICxRJnnoTkenJq3F4nt/L/fQuJfRMEH8T0o5ZBzRNRbUKR8q1K1ssi4ZVxVK01q0umCgvGxGf3gAH51oZ96mzKTRD9ggA+7SCwt8fcFT7h6ik3pn7wo1DQrDT4FPCmpDaoB8q1N5i/wB4Ueanr+lGoXRX+ztU6wqFAAwaUSA9OlHmgdjRqF0Hkj1pwjA70wXMROAwJp3mqegJoswugzjtShj6U3z4t2wtg+9L5q/WizC6HAnPNP7VGJF96XevqKVh3H0lNLqO9LuGM5GKAFo5pN49aAwPQ0ALzSc0tJQAh4ozTHnhQ4aRQfSq51SzBx5jEjsENNJsTaRb69qNoqiNYs/7zj/gFJ/bVoGxh8euKfJLsLnj3L+2jFZy6zESf3Lkf7JzVmO+icZKuv8AvLihxa3BSTLFL2qD7XFkA7hn1U1KGB6c0rDuhRwaKTIpQR60BcMUcU15Y0IDyKpPQE4zTqBigj0oyB2pKKQClie1Jk+tLRTAQmgZ9aKWkAZx1pDzQaaXX1p2FcQg+tAzuGKQyKATngdTUX261Rl33EK5OOZFHP507CugkvoVbBLdBziom1FM/Im76nFch/adwP488DGRmmNqM7OB5ny55GMYouhXZ2P9pAcGL/x8VSu9f8rIiQM3p2H41zQvXBlBfcMcUsd8qttwWHUdxSbtsg17li91C5u2/fNI3+yDwPwpLeyuJCC7CFfVz/QVCLslw+xQew2/4UlxrE7sFBQBegwCannm9IoXKt2TXlpJa8+YHUj72MY/Cqyhm5LZ+hqB7hpQS5LN65oikXoc4PpVKcraisiz52xeuAKhluGUbzuUnpTUuE3crz69DTmlViyOS6HgHjI9DRzBykZuiR3PNM84M6kniq7DJYK64HOM1EJTj0x7VqrPYll55N3GeKRZ85ONx/LFZxc9acsjAEIxGR82B2quUVzTSd2jZFc464NRM7bN5JPOCc1Tjn2gYcgnjj0oSdgSmN2fbk0LQb1LQlOAAOTwc05JPnAZh155qmsvJYEAjpk5qSXau0iRWyMn1zV3RNi48xV92DjqAf0q7bavcWhBWVmLcsrcgnpk1ih8LwT71NC2SQ5yMZxk0rIEdAfEkoyCsefUCpE8QnbjGT64rmH/AHbYJz7jvSBz1FUkhXZ1x1zIBDxjPsacuuA8Ax5981ySynuxo84g8MaLIWp20erED5oxnsQeKbcX0r5QsoB67K5CO6kGMO2R0OatRalNwHIIzydvNTZBd2OgSQ8ZOBSvcOo4Yj6cVkLqRBJCgjtuzT31FhGRhW6etO+oGnHcyKeOc1NFqTxjayjHp3FYS6i2OQv1p0l8M5CjGO1Dt2BXWx0aakGYbsbfQ9asR3cUnTP48VyaajJGcqAfqKmXU3KDCqNvOKlxRSkzpmuUB657cU77REACXXn35rmP7Tc54GPaoHvAT8o/GhQTDnZ17TKnMhCj1Y4qlNrcSOVijMg9ScflXOvcvKw3yO0a9ieQKb5qArgfXnNCiuoc7OhGvAH54Pl9n5qrd6vdyLnmGM8Db3/GseWQkhs5phk7k8ntVKKE5MuibIJMhGaTzV3DJJFUPMyeTSbz0FUSa0c0aIxDKG6YamPcxjOEHPSswNVkzIHRVClFOCcf41PUa1LAvGGegHpQ2oEhiFAYkYzk4FZ3m9OOlOLb2yBz6Cqshal+LUHU/N82eOamW+XyhtkKsOvPWsgMd2MZPvSyPkbtoQD34pOKYXZtRXkRicEs0rdz0FK1/Oq4adwP96ubl1u1t1CmYOR2jXcfz6VQuPEhJxDH/wACc81PKkVds69JJJXOEYnqSxx+NXrKWVN4W5VEB7ng/SvPh4rvlXaRE/qzgk/zpY/F14mN8cDgHoFI4+ual66DWh6cNRiVgjsGPYp8wNSrfQnG5imf7wxXlM/ijVJzm3C2inoyDLD6Mf6VlszFt0ksjsTnLMeTUaIu7PXb/wAS6TYZ8+8TcP4E+Zj+ArDf4h25l2w6fIy9jJIAT+ABxXnwZTxjGe4peY1LDJ96NB3Z3zePTtONOG7/AK78f+g1l3Pj/VHmBhjt4owfuBS276k/0xXIm8kIwVBX1zzTG55X+dNLuJs6668d6nKq+T5cBxyAobJ+p6VlN4m1liT/AGnc8/7eKw/M9c0F6qwjcutau7+JVurqWbb2c8flVM3A2/dAPsBWeJMHrT/NJHWlyoLnWPKRgY6jioizE5HHvUSyxMd/mqR/snmlM6njG0D0Oaw9CyYSn+KlVx61DnPv9KYzqMjpSAstMuNo79TTSyl9wHbHNV1yxAFL5qqfkb6EHnNP0C5Mrnay5OT0NN3sFOWwPugDvVZpArfNIPfvSiWHkyS4I7bf5UAibfjvz6U8yY+YsSewHBqDzrZRkF3yegIXFNeWMtwJAvY7h/OkUkLMJF4OQepz3/GoWaTblgOKcE8x+FdFAzuYk5P4CknRFkBDnb3L4Gf1qlKwuVjDKRgEdOho+0NxhjTZWhT5Yyrt/eDDFVzIFB3jjuw7VqpkuJZNyzEbmzjgZpfOyNxbB9RVRyc5UK2D1B4NIskY++DnPY4p3RNi1v8AehX5qs8qOAYw340iySAc4H60c66hYutIxGVJ4GCKfHOufnBK9wpwapbyv/LVee45pvm7cEPn6ip9pHYdjUMylR8oRT93LZpvmp/erN+09cpgH0NH2nBzgD61anFdRNXNITD3NIJx1rNF3g9A36VILxGHXZn+EjNNTTFymiJvl3AcDrT0nDDnrWcLpSNhkH0xinq57HmncVjVW4AA2senPvUwuXHBx+VZMbFhyCfoKmWXsc8e1K6Cxqq6MM4Q+ueKUlWHBUcdjWcJQcVIjljgDIHNAFnkEDIOfQ075h1BFQmNvvE8euKI5yoIycU+YVi0gO3nrimNlTznB71HHcnle3cg0s13iNYggBHcnOaV3cLEitxnOBS7kEg2tuH8WBjFUZLj+KSVV/3mAqJNQtW5W5VmxyF4/U07gkakrLuKhSuD3pVaBVBcs7d1Axis77cQhREBUnPPX86qS3THhpP1ouO2pvDUlQfu4IRjqcZqB3ypncqockgZrDe6VRgvnHJAqL7ZGw4YcdqS02G9dzeE8QXcZ0AJwQDkj8Kin1KAYEMbMcctIev4VhPeKBy34VAbwnhRRcLGy+oSH7uBn2pkeqNbndK24e/WsR7ts/fH4VXeUseTk0cwWNi5164eQGHEajp3NUbi9uJz++md/QE8VS349zTS5zxRcLFgv/eOKY0vpUBb1NNLj1qbjJi5PekL46nmoQzMcCpQBGBkZPrSbsBPbbt27dj0B71Yb5umM+lUg4xn0p+8HqcHsazd73KJtxBwcA+lKJCOc/lULPleeT2qmztnDNnFNK4maZeJx82B7jrULRP9+JxIPUcEVSzntn2pRI68A7fYVSi1sK5YLMOGUg/SkJwetJHKTw7Bx6YqRgpHTH0p81gsRg04MARUZBUdM03exOOBT3AuhyOlSJcyKeJCPxqErjr1pAOa5DQtm7mI2tIxH1qMyMP4jUQLYxnIpx9uRUgSpNIvR2H0NKJZBj5jz6VCOOhpN5xgjFMaLIun6sM47iporiIqWY5PoRWf5h7Z5oDHgY/Tmq5g0L0cxUHIG1vXvUq3wQ/JsU9jtrN3Z9T70sWGfB/I0nIDSfUZmxiYHHqo/wAKRLxoWU7LZiD97y9xqpJ5ajCADPeq3TtQmO1jVbUI2BMsKsenAApn2uKaEoIUVsYGcVmZxyOOxxTS3Oc4+ozTTE2yxI204ZP1I/SmfaNpOxMZ7k5qMO7LhirDtmmGPnoQPY1aa6kWJTc5OXJHrgUhmPUnAqIpg4y2PpS7FI6/99CjQCUXHHG7OOeKFlZzySB9KiyR/GAKXJ/+uKNAJGfBxvx/wE00vg4LqfwNR78nA3H8KRs5wAR9aasBL5iDgyL+v+FKJVwfnU/Q1VcDgnJ9qcv3eKegFgspPXn/AHhUkUzRfd59iQRVIE54Bp6tgEmnewrGouoSNjfHgY/gOKnW7gxlmcNjONvSsJipGcc96I3FO7GdJHcRsQrSIQeh71KHVywBIIOQfb6VzXmlepqQXMoUGORuOBg9BRzCsdDLeJAuZpAv1Of0qtJrEZjykTliehIX8ayWneX7+zd/e24J+p71F5hHVcj2o5uwWNM6xcdEjjTPUnLf4VWudVu7g4EjAHrsG39etVPNHvQXX+9+lF2FiQFc4xk56nk0rSbRjGR2xUAYbuGBFPGevUexpDJUkKnKttzxxxTjMx43H8ah2d179jSrz1H5GlewWFLf3jSZxzux+FDAY9ajOVHILfh0pqQrEhwf+Wh/KkbYi5Y5+vf8KicBV35zjmoWkL4yeKerAkd9zfLtA9him7j9aj3UhaqESlqaZAKiBLHipFXac9T60XCwNvxnpTOTUjZJGKQrmlcdhVBTnrT8nv0poFLzUtjHA+nWmk59RR2o69DSuA4MNoXBNRv0+diQejY6Gnc9McUoIOVPIPammFiIkxnBAz6+tAYMMke2RT2UbcYqMtjjGKq9xWJIc7+F/E1Pkk9qhVgR/WnhsnrUsaJMng/5NQuvzDJyD0PcU/OTSdCMjNCdgsWhk9VpQo9DmpSoyDS4B7VxuQyPaBjIp3lnGe1PCn0pwWo5gIQvtS7T0wal20uPejmAh2fT8qTyuMnFT7c0baOYCuY/QU0oe1WdtIQcfLjNNTArMrEUwq2MgnPpVn5h94D8KQK742qcdyeKpSYyrlgeBTDuzV0xrxuYZ9AM03ao/hz9afOFypk9MU5FfjII+tTmQcoAVHoFxUZkUOFIIyOpHFPmATA9fwApMAHIU/iacXQHBYD8aUYPAOe/FLmER5wOEX8aQySYwrED0HFPcBepxmjGfenzAR7mJyWOfc0gL9+lSYHfFJgYz/OnzAMyQcbyPal2sf4v0p5UYwenpTSVUYxT5gG7Gzy2aMH8KPMHamlgRxyfSquwHYHpQQp4HFR7vwpuTmqTYEpXnrml+hC1EGIPWlyScj8j0qrhYmBb+9mkLc/MQB2qPziF+7g+1N80dcdaAJiy9c5+lNyrDoajLLx1GaU4xyc/SncBC6D1pGkXPyBiPXNKFZmO0gg8AU0o6n51wO3FO4rCrKd3BIH1qZJR1YMB+HNVwMt0zintuPGDx7UmNImluFdyUXyl7KDnH500ysPm4I9qr8nPHI60BwvPHvRZAPkYsdygnIx9Khyw9z9KsKDsyqkA98cUqWzbS23n1JFNMVituPpSopbkjA/nUj28iEFkPPc96CGPA4p8wWBQAeBTvrSKNooZmx0zUXGAOaXNIMAcCkY4GaLgOHrS5BOQCBUfmBRnFOVugYYJGaAHA5HNKOKYGzTgaQA3HPak3ZpeoxTOh5ppgSysjMNgIBHT0NRMhAHegk04fMNuOad7CGA4pc00jB70oxTuIdk09W5qMjHQ0A460hmz+FL1GMUZNLya864xQeOho+b0AowfWngDv1oAb81Lg4HFSoyD+GpFdf7oFOxain1KyozYGBn3NPEEhOAmfXHNWUDSELGm4ntSzMUbaCSR94c7QfalYfIiv9ll/wCeZz6GnJZk8u6p7D5iR9BTkkkB4cL9BSyzzEgFsqOgPIpCSja5FIux8RLtx6jJqF1c/eyT71MSpPzRj/gLEf400pGf+ei/UBv8KLkNkBUiohb4cvvbPXnv+lWHQ43LJGQOowQajychSDkjIA6kUJsCtJuDEYcKeCduf5VClvJEuRIpB6biavMGBGB+ZpNhY8gH8apTsBmvFKVx5sZPpnmmeRcIMKqAezCr7RyD7sPH0BqKQT7h+779xWqmxlVlusgbOe+DmhZ51bBj/MVLiQjJRseucCnGSVCACwx65qua4iD7Q+7GzJPY043EgHMf14pWuJgc5HPGAKX7XJgAIMnjmn8gIhcY+9Hj6GgzITgk47etWo7941KhIWB67kB/U1A903/PMj0wKd/IYheMfhQGQ9Gx9aQzHvCce65pyNFxmJfyo2EBKDHzA+1JmM9GFOZYxysQP1zSBIj96LH+6TTTQAY165pjfJjAz61I8UR4AP8A30RQsSEEZZT9aakBFvwecgGmlRye3celStbt/DISO+aiKOD1yKpSQCKcfKTn+tISVOOceop4BIAwfypPLYnOKfMgEBOAFANOV2j4+dfxo24FNPI+8PxpcwE5kOzG/wDTmnCQ4GMdcknBqmMk/eH4DNPWbZt2qcggg9SPegabLWbhYxOFYxZxvKfKT9ajVpmcImXLdgo5qeK6vGkEszAiTuxHIBz0HbNMe9keQGJRBtyF8tQAueO3b60uYp2Inku0YAmRD6Y7VEQ7MWbcWPUkcmtNNcv4Dk+S/qrwqR/jTG1fUL9vJOxUdgGCQjaB9P8AOapMHZlHLlgBvznHFKTIjYdDn0ZcV1+jJbKweS5+0vCf3ayxiIdP7pHI5NPFzppST7ZbWrSKcgqhQsOvAH5fhRzFKC7nHrNH/Gjj6f8A16cstqTy0gH0q5e6vDJI7WsU0YY5Xc2MegPPPH0rPnvZ502SSblHOAAP5UEaIVzEZcCbC567T0qQQHyywkVu4we1U9/pzSEmmK5PxkZ6A0hdMjkZ9qg3D3oLAck8UCJ/NUev5Ueco7GoN2aQsOhJpWGTmcdh+tJ53HIxUKkHtSnFFhEqygdR+VBlUjHOaiyPXmj8TTAkaQls+tHnY6AVEfYZNJznkUDJDKc4xQZ24xxURA6/yoxjFAHUlAMYfccc4WlRVJ25Yt6DFXIpbFLdB5G6fJ3M5yhHbA9aSTXZIkKpMkMK/KfJAX+XJ/GvPVhpCwabcSmMmLyY3OPNmO1B7k1pt4buYxujubKXnAC7if1FZa6hbxuk0rmRgwIJOc4PH4VYuvEljqLu22RGzu+SRgoP0ORjirXJbUuy7i3Onyx8SiBAMEssgX/P4VHHYSzAm3eOfHURuDj6jqKptqEEkjM4X5ehYZ/IdKry6xIzbUfauOMgZB9fTFS3EG4s1I7d42wQVA6noB7UjxybFcsCp9/0rEGsyvIA6gqOcluMf0qSbVUVVaEKxHLA9vyqddrCb6I0GUE9vypyquMHOO+azP7X8yLfFHluMqx4HrzU82pQRRLIFd8ttKgYIqPeTJTsyzJHtPt60zB7c06O5hfaqvhnGQGHPTNL5sYBJdSB1qWwsiPYT2pRGQOn604TRN90g8gcdjRcNsgcqdrAcH/9dRqKw3ac9/zpDGSuAxGf1plg8tzGWZQQOAy5+b3q15TdOn1obaHYrrGEAUMQB0xxikMfJ+djn1PSrIiJHDDNKsBYgKCxP93vS52KxU8snq+SPUVEyFXWNZUBP8DLnNav2T7PcIbiA8EFo5M4I9MVTktiUiK+Us0bf6wrvyvYHI/zmtIy7lKJQuZvszRiTb857U4QM53iFXVhxxwR6/WtURERq0U0STAgjEX3SDnOOh+lSMvzZRnIPUtjk9+lPnshcpg3dvhB5dsnHUhTn8qhkjlKKYLSQN0bGev410hikJyHyM9TxSMgXG13OfXHNNVn2HynLNHchstBKM+oJzUZW7yAIJVGepU8V12xRgvI2P8AZXJ/Ko+o6cfnVe3kvsg4tbnMgTLkLDKc99hpvlXZGfIk3Z67a6UpFknYuT1NJhFGAAPzp+3fYVjnjDdbVCwynsflqQQztyIJM5x0NbuVx2/OgbT0I/Op+sPsFjB+z3W4gQyY9MU77NdHJ8hwAPzrc2g9D+tKFQ53Mw+n/wCuj277BYwPsVy/SFl/3qaNKuiOSF9810Oz0O4Z9e1KsQYrg89wxAA/GqVafkPlMA6RK/BfaMdQMmhtKdW+aQRx9N7DofeuhCqq7lUkAAncQtRs0jpgk7ASQFHH/wBem60kFrGE2mFuPtUfttOc1KujPbqkrNuzngEZ/H0q88ojZgFJ9f8A9VSNgYG1fwGKl15CZWtdMu7xXMSxeVF90s4yT7VUeFcnzV8uQeo2mrVxqEFvJ5To6sB/DTP7UDyvvYyoD1c8t/hVxk97CZRkaIOUdtpH60ka4Y7JBsPVf/r1ckuLUpkoqEdA4yfzolKsikoSMcfJ0q+drYRALxoHG5mGOmSQP0p0l88hyZiSeRlicVHLEyLm3PXkoxyPwzVVolkY5gkjbttHB/CtItMZEyhXPORnjFNOPWnvavtBRifbaahZHQ/Nkc4HHNbJp7MCTGOn6UmcjrTTnOMnI65oz7HPrTEO6YNGAOQBSA+tHJ/woGA7Z60vPHOKT60YA68fjRcBdo6UA4HtSAD15oyR0Oc0AKD7c0gP15pvc89+lKfTH0xQAoyOxpueR2zRwCOgx6nFKOv8R/rQA0474OKd83HHHrnFGH7FRSCPvkA560XA1Sp+4pwQMDI/lSjzAoC7XI6jHeraWEyuUkmjVnGcAnn8MU5dNEZ2SXXzPnkRmvM9pEqxmo8skpAYoi8n5ccUhFzyBIGBzyW6Ctr+y4XGySSRz3IAX8acmi2wVQZJmCnPUDP1wKPbRCxjK0wj2yfJu4UelOW1jAwzs5A+YA8Vuvptk7AvAJCvI3OcU5LS0Uk/ZU5OSeTUe3XQLGD5Fu7E5IYrgru6++KjNttKiDDlRgN6106xwp8yQRrxjAQU8yD2UdDtOKXt30CxzCw30YVY7Z/m6lEPXvmrNna6kRiSAqo6Bhg+1bonXOMj8eaBcBvuj8gKHUk18I1Bsyxp94zAhY4l7hnzn8BT00fLbmu3z/dRcD8zWl5j+gAPqRn8qC7kdFrP2kkFrFa10y1gbc5lkzjdg8nHI57flVkRopLCPn1I5pFJyN7Ko745NJ85H3xipbb3YD2PHQfjmmEnIIjGfpRtYdZDSbMjlm47UreYfMdlzj0/KkJZTuLAEdwaTamMknGe9SRIs0ixRqWZjhQOpNUkFiLcCxYFmY9SeppHKAEksfXHNdC/hoJahmkMk+CSo4TpkD39M1mnSbpISXgVCOAgIcEexz/Pmuj2VocxXLZ7FJYJWiWUQv5ZBw+3igxz7Q6qcevapN7+WIvMIQfwgkD8qDLLtCByqk8oM7fyrHn7C5uw1ty43PuPbByKesiiMhtrYHAI/rSETq+B5bpn5SwC5FSXGoSYKuokGQSVxjOK3jex0w5k9Sss7bEAmRiFG/YuAG7j8OlBbseQeOtNQb2LEBM/win7PYfyrCejOepfmZG4yR2I6HrTAABgAY9jU5HsaTaOOKzuZEQRSMA/n1pxhYLv6LnGaZPaCVcLIydxnmqsqXiDAJY9sfdx7+9XHXqOyLm3Hc/gKQrwODVRLqWNW8+IqQPlIH3jU4u4/LWQtwe2ORQ0xWJOnG1h+FO6j5arae8jNMWfzV3fKPQc1cALLkjbgZo2dgI8HvtNIAvllOiE5wrEDP8AkCnbQ5yDlTyCOMj6Ujoo+XOfahNoE2iWHTra+TYkZ+2g8Lk/vVA7ejD07iqwgQZVcj23ZqRA64OyTC/xAdPxqYTQZ33cPnAjG8fJIP8AgQ4b6EfjWrfMi9zLurISKQyBuP4u307isue2SFwPLCnlgA2Qx/HpXTXEUcMYkBYxM21SVwxPU5XJxjNU9Q0y2kXPnkkjA+UgqfXBHP504zcXZ7CaMOOVnXEhOckBSBUQmIVfKcADg5PfNaUmjOSu263cf88+3pkGq8vh+4X5lnV2J3YwVwfrjmt1Up9xWK4kVW3KcMwyAwxUqyMYgxyuWwDs4JHbrzVaTS9RXAeEn5uoII//AFUW/wBstorh9s0R2MMDIyeB0/GtUotXTEyd52il2tww4J5GfwoEiO+TIvPqc5qkkhMu2UElmbO/k8da1NnmLFJ9riEQRd25drc9wNvpjpQ4dgehXJTjuB2GCDQRAWHmInXHHAP5VEz5lk2urAnA2jaPy4oieMq2+Lc4+bOSMjv+PNLla6gL9niwcK64PrnIpRZ56PjHquKmjkiw5WPy0jHPzE5PYcj/ADim+cwyykjPHXp6CjmmgIWs5uxB9c1G8MiH5lPPtxU7Ssx3787TyBkURykD5FPvVKcuoFUqQ+07s+mKXYe+R9auLM5bAjzgZIH165qSSCSQZ2k+pLAgD1o9r3AziFPOM46807Jx92ry2rsA28e3bNNMW4Yk8skcEdP50/aoLFIY6jAIpMjJ4/GrphXGdqtk9AuaYbeHJDRA9/lPT8M0e1QFPcR0/Sk4PIxn3FXTAjEZU4z34x9aHtVZhjGO2KftEB1BSItuKnPqMZpV2joWz3pZIfs82y5bb8oOAMnOPrg1NZWkl86w2iFMDLF5OB75/pXk2ew7a2Im+UYkD5I43AijcqkDaWbpg96vT6TFbczahax56klic/QVmPMqMUEkbqDjcMgEfjQ4tDasSGQn/ln0654xQFkOMKBUfmZAIIAPPUUgmXOQRyexFNeg012JCjH73A9higQrn5i2fqKF2jG4hPfin74iM+au0epxinqO7Q0CNgAsZI+vWnbVAA2Dj0pqtG+3bLkdwG60vmIpCvKAfak7vcHJvcbhQceWBntinhecgY7fWm+dGTjliD3FODsvG0j0UUrCHYkyBgnPtRtYg/MKVpJCcgLz15pPn2gkn3xxV2sMUIRySSeg5p3ylv7360g3EHhsA5GTTizMemPqaLJjsmRyBSVwMVYs7hraTfGFOeCCeo+vao8EjBVeO/apobSaQZ3LGgGSznGKpJ9BpN7Fv+2b3zhIzKQD0xj8Kml1mOaAwmKVFcHJRxkfTNZU8TRn5iCx+7gdvWmEMGHOc9x1H51XPIpSa6EohhMrGNpTHnKqcFwvuehNRy2ziKQrKu8dARuGe2fanbc7VAZ3JxjA/T3prMfkyoZVIJVs4J9wDUOz3RLt1QkVjcrdPE7hnbCrEqYdTj5seo75/nULWrMAfNzzyCOT+VWhIUwgBLBuQVwV9vpTdiYO1VB9D2quZrYfO73I4bS8O4W25jJ94Lg7sVFmRSRIrBxwRjH6VYSFmlVFALN0GeuBn19ATn2qpqF39juEE0G8MqsXZ+Cp6EHvx6VS9/dGi9/RosBwehXj1pc8cEfgaXU2tI7A6jbODEzALbEjzEz1Ge+P5VnaZeyXsyRLbTxPIMxKw/1g9qn2N9iZYe2zLxIHUDNJ04BqaW2uLZVaQqN2cLuUkfXHSkjVHbbuXORy7AY9frUeyZm6UkRjgYOT9ahlt4Jxhhx7cVtpoFyTkzQ7fUbs/liqV5Zz2bhZQpDDKupOGqeSS1FySSu0Z0VlDA++E7T6BuD+FS5dWDZJYdMHj8ql256pmo/KWQkLuBHOewp8r3Ykriee4IGBj0IzTlnX+KMn/d9aQ27sm87gucZwcE/lTUO1V3AegKnIoswsalpaTfZ2ujFi2KkFiwxnBxx9cVnOXwV2ox/hAyOw9+ec1LFJNDnY0sZ7gZ/D61PBdw+YFvII3xjEija6HqDxwfxFPmurBfoY8TzQ2m+diXZiwDE56Dj9Kngf7RCsjK/PA96va+0Jngu9QuvtqXSuxaL5GMqhcArjgHn8utZaT21rF5YkACn3NVVhZX7hyk/kxgBVwoA9KetrJ5RlTJRTgkEjFVTex+YDj5enH9asqY3GRiuezW4EckcjYAI9eTUZMi7B82c8Ac+1WvlPbFIyE4KyBTnjPUVpTrOGhhUoqepXaEyrkorbRkjYP1qH7FA4McgYqyg4Bx06D/61Wh8h27QSecj/ADio5pDuDFSMeoropzi3uZTU4pWRTudGt8ZiiMbYGQG4+tQwFrENEoZYQPk3YHI5J6HjNaaMHVhv9fYilm2uGLKJAecnnmtPaNaMFOVtzMu9QdN8bLCr7RtKxIFJI/iGPc1hu+UbchDZzhRgDntXVT2NrdIium7uTkrk+9U5dPtmGw28uGGMh8mqVS10aRqJJXMEybWI3Zzg5xg1YtXQAuPlzxgdzWg+g2ygGGSWPuSQGHSqc0MttKAj7lXjOMfpR7SMtEa3RaQS7P3gTBz361A8MilfJyAPlwxyB2/Ki3EmGwSSc5IxgVN5qHgRkSKPlOck1ldplFaQuWYsF4x0GfrRMWCKzoSpPUjOPwqxtgizKx3uT6YwaC5mjWQuQM/ex2pqYiqoaVgYmyOhb+6O31p0k7WrhTJuUnG4DJxSyyhPlj5zyXGCCfpTQfMiCFWJB4K8kZq99xE8iiaFS8aBuxJ5NQKkZPlMd+OhVuareYEJXzQvofSpnWFyj+YQx/iVeM/TtT5bDOlwisAFK4HIyOKd6Ar7df60CBxjMingcgAVYhhikjO+5SPa2NpDEn34HSuTlXcvlXcrFYgw/d8kdcZNTpb+bxHalvQhM5/GmvDFnCNuBHPLKas2t1JaE/Z5toPJXqpPrilZdWFl3IkBAzsIOcfdppYngjI/3f61MSjSmeSQvI+SwdScn16gVPYtaxOHmWNzg437sZ9Dyf5UcqfUOVdykqnIYJz6ninbc8bgc/pWx/xLJVK/u4zINpZSAy+w7VmzwmBmUP5wJBjKAbdvfPcGh033G6dupEAB9119uaUpnHJPfg5qW5lxEscTl0IGd6YK+w/xqsH2g/uzj3IGaHB9BOm+mpIBxyWHH+eKQIEOcMSeoOBTXl6FlDZGchhihZY1IxG4PoDmlySF7OQ8/Lzg4zxxkmkBBAPbvnrQJYznKvgepHFIZgeqj0J4FUoMpU5dhxKlCd/y+tBKqo2kk56HtUYmVeQoOe/HNH2g9BtA+vWtFFmkYtFi1eMSbni84c/J0H/16ufa1mZN6lMDLMo3fgB/WsxnZ+2cnjtSFnXq2DVao016FyW7DIUFuV5zlmyRxj0qEyhlzhQBwTzmq8k/lgF5QFJxuPQfXPSq8l/BFJsD+bITtwGHWlZ7jjFtmhGzEcA565xUv9oQWrRBS3nbsrkhlGeM4xgHPrVTxDc2S6a8Vqyl3URkLJuOepI9uP1FZmk6jbFtokmZTtQK6jg+/wCQqY3lHmWxpKlyvlnubM7yTXv2i9lkl3yAuuQOM849OKsRXUENpcR3SDEn3DGvKnHYnj/9dUrjVUsGQrIvmMDt/iyOhq1OYn06zuSluTPGcooHyPnpjtxiqRVLDSqtJNalG9u2h0yR7ePZLtILO5Y7WGGA7An1/CsBboRwql5F5jscrnBVcZ/Mc1oaxqKiWRUMctqHKRs4+YqD7Y+tWLS1stWtZZoYYY7u2VZfld1Cg8kFWB7DPBxx1rRax1BJ03uA1WyHh59Nl0+P7UcZuhFyEznGcevHuKW3GpwXUEt9ctIY2z5T8FVI/wAKp3TSssccbu0bMCxI4HQjp39jWgIpm27mZu2SaTldIJXTLj3AlOVXbk5IJznNM3kxrGYovlzhwMN+J71AI2RsORyexqUE9CppEodHqMkdwLVJJAxO8kH27/lVua9kuIwkwVwG3DK4IP1FYsMbDVJJyGAMe0HHGMjH49a2NJurS1vN+pqstsw2qoJBJPpyPeq5XJ2RDdldkZKZIjUjjuc/jTFDK24E57j1qUq5Z/JSUjJ2ApgsP/1VGsu9SrFRj1HJ/Gs+pN0Pju1iXbkFi+drqCCSO3Oc0tpaPeSlhb/M7bQ2ThDn+nvmq8Fg9y+EQuQy5O7AGTgc11WjabHbwLu8xJlJwwbpn+Lg46Afh9TRYztd2RZsNHt7BQh2SXOBlznr1P8A+qsrXtXAuPItmjZed8keCeuMBsd+p/AVN4jvnswtvDcy75VIIL7tqnHP9B9Sa5+0me1kjljYBox8m4ZA/D8TUznb3URNpe6iwwl1VQWeKOJG2yAuSHJ9c5NSSeDtONlII/M+1lspIHIVvYjkVG+pXP2d4pZIHicHCtEOD04wOPrRcajvQo6kgnhgxVgfUY6GnFxBKPUwJNDnR5cK7tH97eOY+2P8+tMW51GCR4/JYQ9GAj/XPauggcXG5ZJXwvzNI7fMw4HUd+fStJIIYIcwTcbCdhiEvbv3HpQot+YKHZnG/wBpyHG+MhsZPeoxqTyOGX5RyCCO4611z35tQ0NxY2yvuHyNbjG0jqSBz9RTbm28Naopd0FrMy4Zo1KfoOP0FTyRC1+pzT3txsRo40fs4PUH/Cn/ANqW5AHlEbuxbIx9MVcudFS2xJBdRzwHgSKf0YHkfyrHns7a7kKGTayjG7HB4NQlHZoguw3trPOEjQxlugGQM+uDmr8RtlXbJbLIx6sXI4+nTNYkenyWsgmMiMgzv5Pv2q3FdlIwCQwUd+lKTa+FkqC3sXZtsjDy4FXaMZJI3Z9fmPIqu8LM4COobOPmOMn69KLe7WcZZdpOfwqQiM9wwPXNL2sk9SJU02QNJJC+xwyuDghh0rO1aF5lUomSDk47n6/41fdGEYby2JyfuNkexFRROj/Kxx/StfaK14oiFKSle+hmmZorcRIxQjswGG9c1TScggnPAOcDJHvV66s1UN5T4B6r13VnPbSGIEnadxPH4VvT5WjUetwyXBUMeT1znIqwk0rcoBs5+Ucfp61mRRzhhtWQocAgc9amQGGbO8v/ALJPOPWtHBAPnLmdmEZ2H+I9MUTOI4lcncCcLt5JNWYEMgdVIYA4INEDC1LKNj87c9h/h9aXN0GUjaSeUJHK7Sd3zEhsflUfnshJyQR+VaabZmUYJJU/d7A9fasu6t5YNzq2ADtCkZJHrVxlfRgdqOmBgdDxmgg7h1wOcg5zTBvwDsU5/u8DFSbhnn8+1ea9NBAMg5x+PpTsADAGR39KYjhwCDyPVSKCCTjaxPWkFyZChQyFosg42FiGPvxTM8HDD255pPmPJGD9elIFYEkbQPrRdBceGB7Yz19Kce23164qJjsPJ4A6r3pAy8HBGe5FO47lgMwOcFienNCSEgnJPPQnmomKIA7OFVs8kH/OaFmjIAWTdxnDccfSkK4sl2iSbNnz7S4BI+7nGc9BUdvcwyecbqPZBFjLRMDuJIA4x71m6wLeK1kuvLczfKqgjqSehFVtZMtvZpaxpJvCgzOQAic5O3+VdFOCdjppumld7m/a3Fle3P2GyR4jkE3EnO1O/wAuepOPpUXiHTLjS7aWd9RaVVddjpCF2+obB9DWBod5fWMJvbIIhZxHucBix6AD8f1re1DxNeSeGpbK50dQzShnncjBGeM559q6LJOx0OdNwv8AaJbW9/tG1jc3CNxzHwcHp07VO0cDOWWTcRjciDhePX3rmLTSGW3juorg/Nz5PBKKf9rua19CM1tp0UE8JLhi2WHGD0rKcUtUzm1ety8QB/CSB1ycAVBJOgwfL25/unr9KlKmRl3Ev64Xhfb3qaGyILMpQbO7OO/oKzTSBOK63Knmbh8kLbTx854xVDUrfekSReTAFLH5VxgnA/xP4VsNEMbnxgcdOv41E9vmRWDsrA568+/6UKpqJVTDfTY1kiCXzldxU7UAKjk5/MfrTdP0uOO1M4kla5b51DcLx0GPf610Vppls84EkMjAcYyev6Y/OtW68Pm3iEsdsNnXMXz4+vJ4/GtFNtaF87epymqaXc3N1ZzLbTLbIuJGEZ4BYVaNpBvLoGjAAON+3Hp7j8K39NsYb2RhJOIJAc5k4Ei9OG9c9c+tKbiKKS4jhtkmjk+TbI5bp3GOo9DSu2lcqNRo5bTLPTTqLLqUTSQSuVQByuzcSM7vYc/lmug8Qaf4b0IQwafMt2rfPcHzvNcgcDJHTAPAHvWB4ttZodP8xiAoIXYG+YZ5Ga3vDPhk6rajUVidVcny4lCIhxxjnOBkEdPSuinUcYppdTsVGjL3qsrLl/F3Rj6UWvisFlA0uS0hBbLep5PX+daUdpcMUH2Z13jK7l25H41k6MosNcezaK4iurW82llbfgDORwOSMDBFdWkkuyCF2bbMPMHmllLgnHOeCOgx9KiokpMipOMlGUVbTX1XX5le1t4ZEk06crtkKsyFQQcc5P8Au4yfr71VstDvPtzRSXsKWaSszNgFxHtzkAZAA+vPH0p+qW0c8ha0meK5TJcK+3Y3bH0H58VlTvcS5uHvI7CAz/ZpdwbCjheSSeAcH8K1dpJW20/4Jxe8lpvd/wDALdrNa3UHnRGdrcsyrKEA3Eex+o71X1Sa1tbTzZluPL3bQYRgsf6cZplhDNb3Mmn2lzHdwRquGtm3BnbJwMdeOvoa0X0ua6iWKS3ZPLcSMkwxvOeD+Q/nWdlGRq23Etf27fbBGk6hQNoVlBAGMY6UlhprTFWKsVYfIN20Oex9l9/bA5rYt7aCXMzQxyliCdyYJxnt2XkfXvVp1S3Id7V3Z2CDy8An0zk//qArKwWutSS0tFtkjRCVZABkDIA6dPcknPuaranex6RE0ctyZndW2xOq5YYwAcDpn8wKi1PW0trf/iW/vCBgSFsopPc/r168GuTLNMzTXEhllPVmPJz71Mp8uiMpzS0Q95ppZWmkXc7tuckcE+mOw/8ArVavWsZLeO4tCY5ukkLE8cdQSKqLtwcY3L2B7f0pNwIzNk/3RjP59+lY621MtbaoZ5hGCF2n0DD/APVQbg/3tvB6GnOibsDapPHSmbIoyPmbOe/NS7EC+ZxuUsD2OSaWO6lX5BIyg9R0preSADsXg5J6iq0l/GOFIOePTFLV7Alc0TcSSBVbe6t93J38+3cfSmSxqrcAgZzh/WsRNTxKhxuC9x3x6VofbgYsBjhjk8+3Wm4yW5RFe3Udsu4ruYtgY4Oaqq5kWWSOEls5YcfN/wDXq006NES6ZAGTUbKzkFeFY8juPQ1StYqwiTuCd64JORk0wOsgeMNgsOTnoexpkkDKwIBdQMj6fT9KbsYNvPDHjbng+mMU7Im7JbVXiwWGMcnBwKs/bAjDcCB39s9KqRzhpdrKCpH3h1FRTbZZiki5K5IBPOOmKOXmeo9DaAUjIfn270pJztdV+p61m29zJBCis2ewGO/pSpqkiyeW0YQAcMRwR9DWPsn0JsW7mK3f5HRTkcDpzVMoAMbfoBjitCK6Kxb41DoRn5V3BvwPT8KqFju3niMjJbHIz7U4toaZXltoZGV3Vtxx908DFM+zR5bCFmPqalV4t+wsNpOc+tOdohiQvlc459a152itCqY1UbVjxnkPjODWXcfLKy7t2Rjr1NbzrG0e0t15zmqFzYmX5ECsR949/rWtOprqS0V7BgPlc7XHKg96tyzkzo3DIQF4ANQhfLckruAON2MVVe5IyC6oSx2rt7+vpzWlud3EdOgK/KvAHq2T/wDWp+1y2QFAPUnFKQJPl3A4HNKIwuM5I6D5s1wcxIhTd1kU9vrSrGdnyHHfpyaGCg4I5z/CcA0u30OB1zxT5hipv+6Rk+4/SnNtZh8qgEcn+lNBLHAIwB61Jh2UFmbA9GxUk3EaMKOPmPu1RiJCTISC3Bz3qRV65fI68nJ4p+cr1PsBgmjXoBHsxj5wgzzzmmsGYglg2DgY6n8aerqoLOHQdNp5pqTrlQVJfpgKflqkmUk+xW1S2F5bG2MrqxwckZwQcg1Dd2k8tpJEwDuYzljwD7mtJjKcYQKScAE9PeoZ4GZwhkKq3NaRbVrspR7mKLO5Ns0JAiXzfMQj5u+7pUl2krWk8L5bzUIUDjn1x39K0vsshwuMYPzMc561aSInezfvXJ+ZmTJ/OtXUS1NbRSOau1uYNLt5ktnZDtjY8jacdK6bw/pc9zp6XUkpMHyqrRx797E59e3Qn6V2miWum+JNATTrq3UmymVipHO77wb8RkH15qP4maxPoWh2qWAELSz7FKqMKoUk8V1OnzwTCLTdmc5dWEtiyrPJDtYZGzO7H+6eQfrVQHacFyg7NtA4PanG5uGSOc7lLjOCgOT7nqevWlZCr7SRu6lQOPx/GvNlfoRNRv7o1GgkkVS0gQAAnqR6/wD6q2LePw6CyvczSHsXG38gKynlhQ7Duy3BJGPypbYtAVWJlypyvyA4PqfzoU9bBF2ZuS2unNEI7Kx855ASs0wbbH+J/QVRu2v7bT/srXCeW2VMaYIwfcc574p8mpX7xs3ncfxMgxj6nt+NZcrrK+93LE8sQT/OtHO2hcp9jTia7XRfJNvbSovDBiS2PUgf/rq3DYS3MKNdosQVGYSIoUpnHHJJ24H/AOqsX7SbaEKjuvmMDtC5Bx3P6cU67u57vczyF9y4+bkY/p2p+1lYSmluV/FekokBubeaSdLuNI1/dgRhtwHOOgAIP4Uln4k1Lw/E2nWDW8tvbOyxzSKzbgTnGM46k0yUN+5jdisaORtJyPm9vyrldXuZYNXu0jYFBKcAjIFdFOc5q0dDtwdajGo/bxujcTUJ2vZ7x5Yorm8Ztx2fKWb/AGe/IFbel3rQy2t5d3Dz74gwkGC6kjkEZ+UdeK4e1F3NeW07F5nCrMuxCcDrgADjoRXaadb3FzDL5MX2lYWKkBwp5JC89+xqailGy3bDHYqNea9lG0UrI2by0sr6OWS2jaGWQfNdFeCcd16846cevvXHeItMvLCymS5wVnu12qr7wXKsW4HGc4Nd5ZWhWOMIk0CW6/JvAAd2GXbnnOeM1narp0+pwLA0LvmbzRJsI2MvAYY7+lawk+pzKOmph/DTTZLmO6keOJrVXMeCCH8wAdMdsGu1ktUhJ2zNJK4LiLAY44HfBVeAOuKz9DsU8P6TdfupVaaeSUiXjIPGPc4/OnaZIJJftBUpNINpiERARFGFGOwwOPWpm7yHe1kSwXOoxXBNxY7Yi23bG4Zlx39wcjp71m63eNczm2hvXVF3RyBkxg9Oo6j2rbvJ0tIg9wDGCflypOT/AJNYt8NMu5EKToHxtPUK3pz2NYy0VkyJ3ta5mPBJZswgmEoQfO8OQOR+tVpJHkyXVOTwdgG0/hTnljjO14cdgc9fanySidQ7/u2UAbgcE/X1rn5jAgPmBVYYBwAQOAac0ryKqs5QDoMA4H07fWh1beVVlmIXO3hTz6etMEZDDLMME8HPTFVzDuxodvulgT7jg0bjgqq/1qSQKf8AWAEckjGPxqNkK5yC6E+nSpepDVyneNKsTMVyNvXsfbP9KwrmY70RArFiAMDp7+3pXSTRGaP5TmM9Ae30qtLY2ltHHC0YEh+9yc49+1b0pRRUUY3lkq00YMajqvGSPX61c05mJKTHJJGCMAhT2I9aX7LFawTpv/du4YAclfpmnxReWFLHLIvBUACtJSTVh2Gm7UnhMsAckHqKklcs8ZjIyeW96zj5hZmmjXdxkbsAA+tWrSeJpVjYZO3G096mULaiTHJO8jZYMAcrzSmOc5I5JGSAcfjVsWqFf4sKSxBOeSKFXCqFYFlODn09Ki66FNGYyS/biAW2NwACDjPp/hV+OETRo7FWdSASwOSo61P5MWX4VcEfKPakUKyErnk4BFDlcaWoPbq4JAUNuB6+nce9Vr21Ew3FXGQPkY85rRMGFDggZwQc9j/9emyFwQm75uSO4qU2mW4piabc29nYTW15EuFXMZ53KfqO2cdaqPc4Viw6dQBS3RmV12RiSN8bh3H0qQOsY2Njnow7VT11ZNuhVn2yKkscXzcfNio5kZ8xLwGwATwM+3tV1xEqEmMPyWHbBpqtbuCNuCo4z2/GlexLiVoQzRFZH2OOABzmpFbAKbcsRgMv8VOuJAgby9hOAAW7VBPOke3eSpzzjp+VCuxbGddXDRxeS24MCSG/oRUMtvJKigk7uCDgjP1qxdosjqB5ecAZPY5qdbZVj4VVkHTng811qSigubOI4flyCfRxjFTCVS27zD0wBjgD+dVI7YK6ljIxGON3A4/WpBtdtpQgHnp6VwNILE/nQeYAJSSPyP40yS4ZRmIAHn7yHr+FM81EVWRVUk8ZHXPpTo7hZSNpUgH5uefrRt0HaKJYZpGQOx+Y4GOQKWYvwVbnP5j8aV3j3bAcHGeOMj2qvHfJJN5aqwA6nHbPGam7vdIOZdiSaR0x5pyc8AHpTI5FXJCvnOOR3p6tDIwKp1PA64+tPDuG4UOu7ADDls002xq72GxStI3KbUBxz1+uKnBCPu+6rDhgKcbWTfIvA8tASAwGCeeOecVGLm2VFJyzqPlGcGi1gtbdgsBmZ28wqMY3HjHXP+ferlibO2VZrtDdzA4VByie5/vH9PrVXz/McoEMQAJDdcH8qjEW5VbzCd5HITnr3/SmtCuVGpLJ54hjggRXQHdtXGTnocmo5AcMzK+3kblHA/Hp7VAgkAPXJ6AfL/8Ar709Z7oMtvvZoVG0DJ6/ypJcwt9DrfAVmbUXlw8mFuhGyh3GSV3A8e2R+lQ/EjVtEOiS6bNLDc6hIQLaJGDMkhOAxx90DnOeo4rmZba2vo1W4ijkVCT+8JGPxzx9arRwWtpn7PZ28LISDJGisxP1Jz+Vd0MRGEUrbAyUwyacWBnidioAIkypA7iiNjtyTk9cg/e9veoFUyMwO52PPIxTWNsshXLBh1welcMrXuS2SPEpYOsmAAf3ec596n0+KGSdTNKYUHLHOfyx3qPzI7hY9mWC5Ubs8cjOKdDEsUmFEceMng4b60loLQ6O2tNJeZkilZ2K4HzEbc8Z9/xrA1CzksZzDNkP98MDkMOmR6CmoZUkV1TLDJ3BvyzVq8uzfQCK4iQbMFCoxtwf681blFopuLM+IMJSrANGwA3J1A+nerE0UUah4pPNAHOE2k+/NMCKoD/MrjBAA4PtRG0CBiSwwcADrnPpWfPZWQk7KwsoxbMCoP8AGqgc5HIrM1extJ2WYW6uzdWQY3cDk+taflO5DiCQxkEliMD9ah+yI0AZriMLsDFhliOPTjPHYVdPnvoXTdppvYLXVG0+Q2VtD5q3CCP5OFjyOP55rqrCO3l86T7MYQHRo5In2B124BIHqQx/GuY0XT/NlsdRtS0kcpMbArtcBTgg/hk/hXXW2mW1tcK0KujmMqm12IwOT7d66lDl0Nk20l0RdUtI+JA6npw/PFPhT7PbhI43cIMKC4ycdKQxqrb0Pz9skgfjjrUj28FxuibcN4wdrGmaNmFrkn268W0ZUCoC+55dh7/LntUJ8QNpwWGKOAKqY2xyGT5unJIrOv5wl5LEkRiUNtCsoBAHHIqrIqxyAv5rODtzjjr9a5XUabOXns2aWra/dajCIBbmNCo8zLDAPsKxV3/cC5JPTuRUskIdi32wKMkY2k/hwOeajd3tJ0ktpwxX+7ng/jUtuT1M277iHhNuAVxnLUecFiYeSN38J5J/SmTSknc21WJJLDpSrdeXKGKkMOVI/wA5qUiQhdJcycxkcfd/lUqM2Bhtw6YHP51ElyWJBKoEBwXGQ3eli8st8j+WSOuePp/+uk0BOz4xncoyeMd+lOEeYPNRwM5znHr6d6iWUoWxjkYIPNQ3byshX/WEqSeOPWiCV9RqwssSsAdgIY8NEx5/Oq09ismMSyRHrhlz04qezdzE0TyNtVuOcZJH8qn28k7g/bH4Vcpcr0BmTLZzld0ZWVSeq8jGKoB5EY5Vk+bG0jHQf54966dFRm27EzjGSMc1HJGrqyzKWQjgY3f/AF6cKvkK7MJwLhEPl7GznJxkU2GGKBmkKq7H24x2/wD11tPpsTICqtnGSwIyOPQ81RbTMSkxyDd/dLYzWiqLYLlOW8kkBCgn5gNw9PpTo5ZGJCbpGHAbGevTPpTzp4UNHNcpEGHQDk564qO4iFqVERYrxHkn5id3etFyvRDuOikYnDuvzDI5xwauW4yRtcc9M+tUZbZZAHV8bF27T0B96ZEZkQbcMhQ4I5z9P8KmUU9gehtCbdAY2I83jAFQzvIzBg20AZOagtpbf92pJaTbjCrkZ/nVpkCjlRj0HWsm7aFKRViuGaVQRlSC2PSnMEBd0P8As4NEuUTCpkZAA74pSB5Q/I5Pc1RXMM/eSs0bIu0qDnPNQsWdzGeNvQ+1WFIjhYM7fIODjp6fWqskpZVYcc8Hsc002xOQ0RlTiQg+nNQ3Np5ikbuhznOPwqZ8MRldpA6Hiq8k0gPlllIx09KuN76E3RmgMrkglgpyuame7kChSxYHB21aZmeMqMLzzmq7W6ltx9vlPGfyroUlLcRrSTStKFLbcDOc5z6D3qeGSd3Fv5RVcBtzDBY/UduPzqydNcECYFy3Kq6YH5d8elPjkCELIckDIHqa45NWtYdu5HHtZGEcTSHcRtUZP5fzqAgMzbBHuxkquR7cgfyq3HemNsKvlrkfcGMmrDvsDElQ3dgOSfXNRdIVkVobL7ZHH5m9XfjIHzH2x/IUq2dpbmZPIkLccg8lh659PSlEuXJDBG6jsc0+F3diS21sEcDOaXMyrhEsSANHEEwAQCuT/wDqxUsQxlpdysTlduMD6iooIWIyXMvuvv8Az+tWba2tzMv2q4cKAWIA4P1P1o3drgn0IZjGnEbhuSAQeq564PNQpFIzqGl+XI4ZQS2eeT2HpViWymuJWSELIinO9W2/gaRQsSoW8vf93l+Pr9arVK9itbXBRIsmdxPGAq/wr707ddHlCBk45HQeuKZ57gCJJNz9++M9Pamu+CoG/dgMDjk5rOz7E3sh4e5RjvZm5xuJ496d57SAE8E9d38VVGkmaZURx5e0nbu6nPGR/n9KkbzJCGdcngAqcfkOwFHLbYRaW5SNhGAdxGQccnPrUiFGJzGCVO7n9aozRzRo06w7j6k9V7HPQVNGWEIdl5K8DOcDsadmtQu07DnlNupYRsSx6AZ4Hv260KYjEn7smMAgA9Rz0+tMztlBDMV6YI+Xpzn3rQ0qxN9IYy8MYQEk7ScegP4n19au1xvUhYLAoZXUdwIxjNT6fF/adw8UmPJ+8745Uk9R7k0y4hSGSRGKzRxsPnHyrntj361Y0rVUtbd18pSpwyYGCW9j7VK+LUIrXU230fTPlVWaLaADiTI/L161z+sWbwrut3EsbHK8YI59qemqSC7aeQNLKeUUsAE9cDuenX3qi4DYIMquw+6W/OnNxtsOUo9EMijLFDNIYt3DOxyBzXd3lvat9ngtiIYkjDvMiYbb0HPXnGaxbDTF06EavqoWOOPLRW5GGfj7zZ/E49qkFte61dNqdu5gAIQHzGAPoBjOfyrWlHl33ZdNLqaC6LpZ2yhJpjgYaSUtn65pt1pmnzxrbmCNIuSUVSuTjAOV9Kjl/tOzRXuI4Z8cAq7FifpirCM/lLLN+6VuqHOT6frWq0N1FCWenpab7aMmKNcMp6qfYD2q5sQkZd+McDiqUUd2tzLKjLIsg4V3wFxx2FHn3bzGBbBWK43MXwpHsT1pjWhpRQbg26YsGPHsKS1hC6pIGk3gQqyoDjBJIyffFVnuLiNCsNrnOcEvwD9MdPyqtotw0us3KywSQebCANwOCwJJ2k9ev8qpPVESOb1bdJqd652gi4Yg45POD/Ks/eVBwd6ZPU4wKu+ILSfTNbZGZpFkfdG7HlgRnPuexrPG6TL9OC4HTHtj/PWvOqRfM7nJLcHii5271ViACecA0x7fI2hgxX29qvKPtEAztUj+AkZz149eKqsqSSu0UhjBydrcKDj17dqhN3EQNDvyjKrEcEnvRJGhQGRgQOAuOQf8akQSGQMQGQJklupIz2pI5JWIcoXOM/dxj1P07Zq02MjWJkAbftIByG6/SohMRO8ZjYhcDLDvxzirBnwrbScKSGUjkH0qIXkThTz86/KM5yPX2qrvsFyYwGRstgkYboRio2jlUsDICp+ZTt9f59KkWURhcAlSoOAc598UjFTulCs4GMpkf5/yam4tBiY2hpFbBPOD0+tPkk8oA/KRu6qeRSZV1Zoy28AE84+h5/KpApfb5iBwB1zgggdRRYn0CKTzBgNuyRu9fzpyEOcKwJBIx0IqL/RYyYUVFfoAfr1prRs4Z8YI43pyT+FKw7lpFR1yeCCflxz9c9qSWJHyxxkjBJ78eneq6SALh3ck4Kk8Z4pWfYC7sQO2OTRqFxkunQHHmKH4xkj+ftToba3MBjuLfzcMCjeZjA79Kf56KVzlT35wD+NOM6s3yEsnUh1H9KtSlYZRkt4PmkjDkED5D0A6H3ongWaFo2Zo1f5QAMrntx9avT7WzgK6joR0FRIpIPlSDPQKxxQpCKghSJkMsigE5BIAKEdx60xokYTPFOzgNu2gcj1qW40+K4LGWPEgIyy9aihsp7ZikP7xD2wdwPfn+la3TW+oWZQnvFRwgZgSoYHsRSLPKVCqWc43Y9u1dHqHh+wk0N7tbaaK+BBwWJBOecqf6Vzo8zP2eWJkZflyBjOMkc1tZJFWsSw3LO7KRkoB83Tr61I0n70QujfN0z6/4VQuN5Znxnoecn9PzpyXRIQhgVXBU9D+VLk6olEkhLkKMLyfl64qK8jcACIr94ZxxipHdmk3gHGM9qbKwMowSd1NDIDuyBtOSPXvT4oJpTLMfLxBHu+c/gMDufakcSZZgMc96S1u5UWaBjjzAM/nVruM6APM8hdN+V+6W4xQIXkk3SqvzHg7sMABVe7Plou3oTyM4zxntVu3IKq5Ay+1j9c4rl8yvNkCQtHlUjjj3NnlyzD+gJqU53/L5YI4LFc+nFPVmaYgkgbcEDoeahRjIzE8EDjBIobbY730ZOe4IyGbA4xgD/JphuFiYqdiueT2yPrUCTu4jjIXG7GQoBxz3/CpZLdJP3Tliv196biU7WsHmySRLt3xjG7cDtHB7Us88sKbVYLJgEFcsT+HpT5IVi8tAS2MKC3J/wA8U+dNtnN8zHMiLyc96nRvYWlyP7W0cO8x+UOjFmxn69s0gu0nYSQDerfLhACB/wDWqG/CrbyttBKAAZ+oplugQZDHOOv1q1FWuaKOly+JFCfKmGH3mPr2ptlfbZQ2xCp4UMAcgfWoJ4g8DFmc7ZMfe69TzVVYgq6XKHfdO7eZliQcMe1JQctbmTTexckctLL9nSNWJ6Kfu57c5xU8QcRkF2XIyR1/D86r2cStE8pyGBwvtxn+verVrEs6jfn7m7g9cdqh66EK8tCa3dV4VzkDqO5/rT2VnUkkHaOABj8/wrNubiRQSpAIYjil0y3+3apFBLNKEAyNrYxWkaV9GdXsUlqzRVwycLg9cEYGKHmuEYqFMZIyuRjP0re0i0tluiRAm4IMMfmYdeQT396bqqRS6SzPDGWiGY2xyvJ6Gk6asQ6elzAEpeXa5BYZIRuM0QSRAM2FVVTdjGSzD3PTPNRv+7TjnBA59wKj8wuoJAzljkZHTFYtGDQ/ziXJEYBwHyeeD0yDWj4ehF1r9pGU43mVs9goz+pArKg4LnJLGQZY9ea6fwHbxJeXUqphxEBn6tz/ACFVBLnSGo3aRv6sI73U7a2mG+ONGldT0bPAz7VJHDZ26EW1ukIHOIxsGfoK5vVtRubTXriaJhuVzHhhkYCrj+Zq9eX80emJcIEWRxkkDpzXZzas6o2ZoTzoCVcuwYAKgYhj6/WnxSq3zAHJHGSRXL6VqtzdalAs2x/OOCSORwenpXRMdqyHJO3HU9cjvSTuaKzRLbBHi3shVz1BpySsXLbf3eOTu6DHpUUTHcsfYh/0NTJ3PfpTALe7hknKKec5HPao7y2ijv7K6VcOJSGYseM+3Tmk1KZrZC0QUMVznHSue1TXL2dIomZVBnQ5UEEZJGPpTTtoZyaNDxvhI7WVskLvQ8dM7cfyrk/LLktCRGiISSWHLY/yK67x9bqmkxybnZo5wg3HOQwOc+vSuOAxZRnJzIWDe4B4FclZe9c556MXCToqj5TtAO49x7+vFDW8cbgRbzuO7djIPI4Ht1/Oq07usjIGI4OD3HFWrMF7eKXcyswbO046D/61YJMwuVI/PV2VxukJJXBJJH1P8qWNyJEQZ6nBJJFSzp5c42kgFckdsjvTBEhjLEdWYY7YNXoUh2zeXAYlyAegyvscU144Xh4Xci/wj+lMllbDgYAG7p9cU0St9sMXG1QPx4zzTXcEKqlAVGY9o3AuMjPTrTgs6splARCQcnpn049hUiElEPQlST+tPhnkKFSeAob60cytsNohG6OUtuUrJyGUdfrU0K+XIMRLLG3UM5HtRKT5auDgvw2O/NJgNHvbksBn0PX/AAqW+ognEYkVo45Yx2JboTjvjFCS+WThR8zfNjio2+UqvUMCeT05qKWV/M4O3GensKe+gXLp3SSBSmNxCjJAHTPXsKhgjhyFIMQ+6SO3bp6ioreeWSIFnOd5/mKtsc7mYAks2c9yO/1qdVoBXXcXdZIXlAHJB46+1Bl2TEBnOzLY4I+hFWZFBTzDkn5QRnAII9qh8tXBY8FBkEd/Y+1Ve4DI7mNXypyD68YqeZwwB4ErDKk88/8A6qbtEind1557jmqkWXVldmbG8gk8jBxRFJ6oEP8AMTJVX+cEBhjnFWTM1r5YjY7tuXzwQT0H0AqDHlRKF53MFOeewppkdYlIYkkkcnoKARek1CaWI28zHkggk5APrUBSKRCrsOnr39ajkYgOB0G1vxwP8alh+fAwF80jcV4pat7lXuVZ9PhkCuV6jGegIzVJ9IXzW5+R1/AH1HrWkWIGB0U8CpfNYAgBQOD0pqpJbMDBTTbmFGCNu+bpnk1NJZylMd89TW7HEkhBI6+naq0sa8+xq/ayYtjEjtpySsw+Yg+9RmxkG0lQEB4wf88VtYwgOSTg0sZ3Mc88gfpmq9qwuf/Z";

  const routes = {
    "miniapp-map-discovery": [
      { value: "pages/map/index", label: "地图" },
      { value: "spot/search", label: "搜索观星点" }
    ],
    "miniapp-sky-orientation": [{ value: "sky/detail", label: "方位天空" }],
    "miniapp-my-library": [
      { value: "pages/my/index", label: "我的" },
      { value: "plan/detail", label: "今晚计划" },
      { value: "settings", label: "设置" }
    ],
    "miniapp-profile-content": [
      { value: "profile/links", label: "个人链接" },
      { value: "content/import", label: "内容导入" }
    ],
    "miniapp-contribution-intake": [{ value: "content/contribution/index", label: "现场反馈" }]
  };

  const timeline = [
    { iso: "2026-09-03T19:00:00+08:00", label: "19:00" },
    { iso: "2026-09-03T19:30:00+08:00", label: "19:30" },
    { iso: "2026-09-03T20:00:00+08:00", label: "20:00" },
    { iso: "2026-09-03T20:30:00+08:00", label: "20:30" },
    { iso: "2026-09-03T21:00:00+08:00", label: "21:00" },
    { iso: "2026-09-03T21:30:00+08:00", label: "21:30" },
    { iso: "2026-09-03T22:00:00+08:00", label: "22:00" },
    { iso: "2026-09-03T22:30:00+08:00", label: "22:30" },
    { iso: "2026-09-03T23:00:00+08:00", label: "23:00" },
    { iso: "2026-09-03T23:30:00+08:00", label: "23:30" },
    { iso: "2026-09-04T00:00:00+08:00", label: "00:00" },
    { iso: "2026-09-04T00:30:00+08:00", label: "00:30" },
    { iso: "2026-09-04T01:00:00+08:00", label: "01:00" }
  ];

  const spots = [
    {
      id: "east-lingshan-trail",
      name: "东灵山步道",
      group: "wanted",
      city: "北京 · 门头沟",
      meta: "山地步道 · 夜间开放需复核",
      image: `data:image/jpeg;base64,${EAST_LINGSHAN_IMAGE}`
    },
    {
      id: "hongshuikou-village",
      name: "洪水口村",
      group: "other",
      city: "北京 · 门头沟",
      meta: "停车：暂无数据 · 步行：暂无数据",
      image: ""
    },
    {
      id: "lingshan-scenic-area",
      name: "灵山景区",
      group: "other",
      city: "北京 · 门头沟",
      meta: "路线状态：暂无数据",
      image: ""
    }
  ];

  const iconPaths = {
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
    close: '<path d="m7 7 10 10M17 7 7 17"></path>',
    back: '<path d="m15 18-6-6 6-6"></path>',
    map: '<path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2Z"></path><path d="M9 4v14M15 6v14"></path>',
    user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    location: '<circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>',
    layers: '<path d="m12 3 8 4-8 4-8-4Z"></path><path d="m4 12 8 4 8-4M4 17l8 4 8-4"></path>',
    instrument: '<path d="M4 18h16M6 15l3-9 3 6 3-8 3 11"></path>',
    cloud: '<path d="M6 18h11a4 4 0 0 0 0-8 6 6 0 0 0-11.4 2A3 3 0 0 0 6 18Z"></path>',
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path>',
    moon: '<path d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10Z"></path>',
    route: '<circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="6" r="2"></circle><path d="M8 18c6 0 4-12 8-12"></path>',
    parking: '<path d="M7 20V4h6a5 5 0 0 1 0 10H7"></path>',
    foot: '<path d="M10 4c1 4-1 6-3 8s-1 6 2 7M15 5c-1 3 0 5 2 7s1 5-2 7"></path>',
    share: '<circle cx="18" cy="5" r="2"></circle><circle cx="6" cy="12" r="2"></circle><circle cx="18" cy="19" r="2"></circle><path d="m8 11 8-5M8 13l8 5"></path>',
    telescope: '<path d="m5 9 10-5 3 5-10 5Z"></path><path d="m10 13 2 3M12 16l-3 5M12 16l5 5"></path>',
    chevron: '<path d="m9 6 6 6-6 6"></path>',
    down: '<path d="m6 9 6 6 6-6"></path>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19 13.5v-3l-2-.7-.8-1.9.9-1.9-2.1-2.1-1.9.9-1.9-.8L10.5 2h-3l-.7 2-1.9.8L3 3.9.9 6l.9 1.9L1 9.8l-2 .7v3l2 .7.8 1.9-.9 1.9L3 20.1l1.9-.9 1.9.8.7 2h3l.7-2 1.9-.8 1.9.9 2.1-2.1-.9-1.9.8-1.9Z" transform="translate(2)"></path>',
    clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7h.01"></path>',
    alert: '<path d="M12 3 2.5 20h19Z"></path><path d="M12 9v4M12 17h.01"></path>',
    retry: '<path d="M20 6v5h-5M4 18v-5h5"></path><path d="M18 11a7 7 0 0 0-12-4l-2 4M6 13a7 7 0 0 0 12 4l2-4"></path>',
    target: '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"></path><path d="M4 15v5h16v-5"></path>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"></path>',
    star: '<path d="M12 2.8c.48 0 .92.28 1.13.71l2.02 4.1 4.52.66c.47.07.86.4 1.01.85.15.46.03.95-.31 1.28l-3.27 3.19.77 4.5c.08.47-.11.94-.5 1.22-.39.28-.9.32-1.32.1L12 17.28l-4.05 2.13c-.42.22-.93.18-1.32-.1-.39-.28-.58-.75-.5-1.22l.77-4.5-3.27-3.19a1.24 1.24 0 0 1-.31-1.28c.15-.45.54-.78 1.01-.85l4.52-.66 2.02-4.1c.21-.43.65-.71 1.13-.71Z"></path>'
  };

  const state = {
    surface: "miniapp-map-discovery",
    route: "pages/map/index",
    general: "ready",
    theme: "day",
    viewport: 390,
    textScale: 100,
    motion: "normal",
    transparency: "normal",
    currentSpotId: null,
    bottomPresentation: "none",
    panelExtent: "small",
    panelSection: "overview",
    panelPreviousExtent: "medium",
    layerClosing: false,
    layerRestorePending: false,
    layer: "LIGHT",
    timeIndex: 6,
    query: "",
    suggestionsOpen: false,
    filters: new Set(["低光害"]),
    partitions: { wanted: true, other: true },
    favorite: false,
    favoriteError: "",
    evidenceOpen: false,
    guideOpen: false,
    routeNotice: "",
    notice: "",
    objectListOpen: false,
    pose: { alpha: 28, beta: -12, gamma: 4 },
    switches: { nightDefault: false, reminders: true },
    importRights: new Set(),
    contributionTopics: new Set(["路况"]),
    contributionKind: "condition",
    contributionLocationConsent: false,
    contributionOrigin: "my",
    contributionSpotMode: "select",
    contributionMedia: [],
    contributionMediaSequence: 0,
    contributionMediaRights: false,
    contributionTouched: new Set(),
    contributionSubmitting: false,
    contributionSubmitted: false,
    contributionIdempotencyKey: "dra-local-contribution-1",
    drafts: {
      plan: "东灵山步道观测",
      profileUrl: "",
      importSource: "",
      importBody: "",
      observedAt: "",
      evidence: ""
    }
  };

  let rulerDrag = null;
  let modeDrag = null;
  let suppressModeClick = false;
  let mapSpacePointer = null;
  let mapSpaceClickArmed = false;
  let mapSpaceClickTimer = null;
  let panelDrag = null;
  let panelEdgeDrag = null;
  let searchComposing = false;
  const rulerScrollTimers = new WeakMap();
  let panelPresentationFrame = null;
  let noticeTimer = null;
  let disclosureSequence = 0;
  let searchHistoryArmed = false;
  let searchHistoryBaseUrl = "";
  let searchHistoryEntryId = 0;
  let searchHistoryPopExpected = false;
  let searchHistoryFallbackDebt = 0;
  let searchHistoryFallbackTimer = null;
  let searchExitInFlight = false;
  let searchExitTimer = null;
  let searchEdgeDrag = null;
  let searchSuppressCompositionReopen = false;
  let searchDeferredCompositionCommit = false;
  let layerHistoryArmed = false;
  let layerHistoryPopExpected = false;
  const partitionAnimations = new WeakMap();

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function icon(name, filled) {
    const path = iconPaths[name] || iconPaths.info;
    return `<svg class="ui-icon${filled ? " fill" : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${path}</svg>`;
  }

  function currentSpot() {
    return spots.find(spot => spot.id === state.currentSpotId) || spots[0];
  }

  function panelExtentA11y(extent) {
    return {
      small: { label: "拖动调整信息面板高度", value: "当前小档", now: "0" },
      medium: { label: "拖动调整信息面板高度", value: "当前中档", now: "1" },
      large: { label: "下拉返回中档信息", value: "当前全屏", now: "2" }
    }[extent] || { label: "切换信息面板高度", value: "当前小档", now: "0" };
  }

  function syncPanelHandleSemantics(panel, extent) {
    const handle = panel?.querySelector(".panel-handle");
    if (!handle) return;
    const semantics = panelExtentA11y(extent);
    handle.setAttribute("aria-label", semantics.label);
    handle.setAttribute("aria-valuetext", semantics.value);
    handle.setAttribute("aria-valuenow", semantics.now);
  }

  function lockMapSceneOrigin() {
    const scene = root.querySelector(".map-scene");
    if (!scene) return;
    if (scene.scrollTop !== 0) scene.scrollTop = 0;
    if (scene.scrollLeft !== 0) scene.scrollLeft = 0;
  }

  function focusWithoutScroll(element) {
    if (!element) return;
    element.focus({ preventScroll: true });
    lockMapSceneOrigin();
    requestAnimationFrame(lockMapSceneOrigin);
  }

  function stateStatus() {
    if (state.general === "partial") return ["视宁度缺失，天文证据不完整", ""];
    if (state.general === "stale") return ["云量更新较旧，当前数值可能变化", "stale"];
    if (state.general === "offline") return ["道路开放状态未联网更新，出发前需复核", "risk"];
    if (["error", "unavailable"].includes(state.general)) return ["路线状态加载失败，末段通行无法确认", "risk"];
    return null;
  }

  function topbar(title, action) {
    return `<header class="page-topbar" data-od-id="page-header"><button class="icon-button" type="button" data-action="back" aria-label="返回">${icon("back")}</button><h1>${escapeHtml(title)}</h1>${action || '<span class="topbar-spacer"></span>'}</header>`;
  }

  function primaryNav(active) {
    return `<nav class="primary-nav" data-control="mini-primary-navigation" data-od-id="mini-primary-navigation" aria-label="主导航"><button type="button" data-action="nav-map" ${active === "map" ? 'aria-current="page"' : ""}>${icon("map")}<span>地图</span></button><button type="button" data-action="nav-my" ${active === "my" ? 'aria-current="page"' : ""}>${icon("user")}<span>我的</span></button></nav>`;
  }

  function sourceDisclosure(scope) {
    const disclosureId = `source-detail-${++disclosureSequence}`;
    return `<div data-control="data-source-disclosure" data-od-id="data-source-disclosure-${disclosureSequence}"><button class="action-row" type="button" data-action="evidence" aria-expanded="${state.evidenceOpen}" aria-controls="${disclosureId}"><span><strong>数据来源与更新时间</strong><small>${escapeHtml(scope)} · 最近更新 18:40</small></span>${icon("chevron")}</button><div id="${disclosureId}" class="inline-note" ${state.evidenceOpen ? "" : "hidden"}>${icon("info")}<span>天气、路线与开放信息分别标注来源；缺失值保持未知，不按零处理。</span></div></div>`;
  }

  function notification() {
    const message = state.notice || (state.general === "success" ? "云量时间序列已更新。" : "");
    return `<div class="notification" data-control="notification-feedback" data-od-id="notification-feedback" role="status" ${message ? "" : "hidden"}><span>${escapeHtml(message)}</span><button class="icon-button" type="button" data-action="notice-close" aria-label="关闭消息">${icon("close")}</button></div>`;
  }

  function recovery() {
    const copy = {
      "cold-start": ["正在恢复今晚计划", "地点与时间仍保留，云量和道路开放状态正在更新。"],
      loading: ["正在更新云量", "已确认地点仍可查看；云量返回后将更新当前数值。"],
      empty: ["当前筛选没有观星点", "已保留搜索词；调整选项后可继续查找。"],
      error: ["道路状态加载失败", "末段通行暂时无法确认，请先核实再规划路线。"],
      offline: ["道路开放状态未联网更新", "地点与时间仍可查看，出发前需重新联网复核。"],
      recovery: ["正在恢复云量数据", "恢复完成前仅保留已确认地点与时间。"],
      retry: ["云量更新失败", "重试只刷新云量，不改变已选地点与时间。"]
    }[state.general];
    return `<section class="state-recovery" data-control="page-state-recovery" data-od-id="page-state-recovery" role="${state.general === "error" ? "alert" : "status"}" ${copy ? "" : "hidden"}>${copy ? `<h2>${copy[0]}</h2><p class="body-copy">${copy[1]}</p><button class="btn" type="button" data-action="recover">${icon("retry")} 重试</button>` : ""}</section>`;
  }

  function sharedOverlays() {
    return `${recovery()}${notification()}`;
  }

  function renderRuler(control, label) {
    const stableControlMarker = {
      "map-time-control": 'data-control="map-time-control"',
      "sky-time-scrubber": 'data-control="sky-time-scrubber"',
      "sky-orientation-time-ruler": 'data-control="sky-orientation-time-ruler"'
    }[control];
    const ticks = timeline.map((slice, index) => {
      const major = index % 4 === 0;
      const event = index === 8;
      return `<i class="ruler-tick${major ? " major" : ""}${event ? " event" : ""}" data-index="${index}" data-iso="${slice.iso}">${major ? `<span>${slice.label}</span>` : ""}</i>`;
    }).join("");
    return `<div class="ruler" ${stableControlMarker} data-od-id="${control}" data-ruler-owner="${control}" data-interaction-model="taro-enhanced-scroll-view"><div class="ruler-shell"><strong class="ruler-current" data-ruler-current>${timeline[state.timeIndex].label}</strong><i class="ruler-axis" aria-hidden="true"></i><div class="ruler-viewport" data-ruler data-scroll-x="true" data-enhanced="true" data-show-scrollbar="false" data-fast-deceleration="true" role="slider" tabindex="0" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="${timeline.length - 1}" aria-valuenow="${state.timeIndex}" aria-valuetext="${timeline[state.timeIndex].label}" aria-orientation="horizontal"><div class="ruler-track">${ticks}</div></div></div></div>`;
  }

  function routeSummary() {
    return `<section class="panel-section" data-control="spot-route-summary" data-od-id="spot-route-summary"><h3>路线与海拔</h3><div class="route-chart" role="img" aria-label="路线从 640 米上升到 860 米，最后步行约 8 分钟"><svg viewBox="0 0 300 62" aria-hidden="true"><path class="route-fill" d="M0 54 45 47 92 49 142 34 195 38 240 20 300 14V62H0Z"></path><path class="route-line" d="M0 54 45 47 92 49 142 34 195 38 240 20 300 14"></path></svg></div><div class="panel-rows"><div class="info-row"><span>预计到达</span><span class="mono">42 分钟</span></div><div class="info-row"><span>最后步行</span><span>约 8 分钟</span></div></div></section>`;
  }

  function matrix() {
    const rows = [
      ["时间", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"],
      ["总云量", "28%", "24%", "18%", "16%", "22%", "35%"],
      ["透明度", "一般", "一般", "良好", "良好", "良好", "一般"],
      ["视宁度", "缺", "缺", "一般", "一般", "一般", "缺"],
      ["风", "2级", "2级", "2级", "3级", "3级", "3级"]
    ];
    return `<div class="matrix-wrap" role="region" aria-label="核心观测条件，可横向滚动" tabindex="0"><div class="matrix" role="table">${rows.flatMap((row, r) => row.map((cell, c) => `<div role="${r === 0 || c === 0 ? "columnheader" : "cell"}" class="${c === 5 ? "selected-col" : ""}">${cell}</div>`)).join("")}</div></div>`;
  }

  function skyPreview() {
    return `<div class="sky-preview" data-control="sky-map-canvas" data-od-id="sky-map-canvas" role="img" aria-label="22点天空摘要：猎户座位于东南，木星位于东侧"><svg viewBox="0 0 300 150" aria-hidden="true"><path class="sky-grid" d="M20 126 Q150 34 280 126M48 126Q150 63 252 126M150 20V132"></path><path class="sky-path" d="M38 112 Q146 50 264 95"></path><circle class="sky-target" cx="183" cy="65" r="5"></circle><circle class="sky-target" cx="235" cy="87" r="4"></circle><text x="190" y="61" fill="currentColor" font-size="11">猎户座</text><text x="241" y="84" fill="currentColor" font-size="11">木星</text></svg></div>`;
  }


  function mapSvg() {
    return `<svg viewBox="0 0 390 720" preserveAspectRatio="none" aria-hidden="true"><path class="map-contour" d="M-20 150C80 90 160 210 280 135S430 95 450 110M-30 230C60 160 175 290 310 200s145-80 170-65M-10 360c110-90 190 60 300-35s130-35 160-20M-10 520c120-70 200 45 330-20s120-30 155 0"></path><path class="map-contour" d="M66 0c34 140-35 230 20 370s-10 250 20 390M240-20c-25 125 45 230 0 350s32 245 15 410"></path><path class="map-route" d="M48 610C120 540 132 400 220 350s80-150 135-238"></path></svg>`;
  }


  function filterChoice(label, iconName) {
    const checked = state.filters.has(label);
    return `<button class="filter-hit" type="button" data-control="spot-search-filter-choice" data-action="filter" data-value="${escapeHtml(label)}" role="checkbox" aria-checked="${checked}"><span class="filter-capsule">${icon(iconName)}<span class="filter-label">${escapeHtml(label)}</span><svg class="filter-star ui-icon fill" viewBox="0 0 24 24" aria-hidden="true">${iconPaths.star}</svg></span></button>`;
  }



  function planPage() {
    return `<section class="app-page document-page" data-surface="miniapp-my-library" data-route="plan/detail" data-od-id="surface-plan">${topbar("今晚计划")}<section class="section" data-control="plan-editor"><h2>出发安排</h2><div class="form-stack"><div class="field"><label for="plan-name">计划名称</label><input id="plan-name" value="${escapeHtml(state.drafts.plan)}"></div><div class="info-row"><span>主地点</span><span>${escapeHtml(currentSpot().name)}</span></div><div class="info-row"><span>计划时段</span><span class="mono">21:40–23:10</span></div><div class="risk-strip">${icon("alert")}<span>开放与路况仍需在出发前复核。</span></div><button class="btn commit" type="button" data-action="plan-save">保存计划</button></div></section>${sharedOverlays()}</section>`;
  }


  function renderMy() {
    if (state.route === "plan/detail") return planPage();
    if (state.route === "settings") return settingsPage();
    return myRoot();
  }

  function profileLinks() {
    const valid = !state.drafts.profileUrl || /^https?:\/\/[^\s/@]+(?:\/[^\s]*)?$/i.test(state.drafts.profileUrl);
    return `<section class="app-page document-page" data-surface="miniapp-profile-content" data-route="profile/links" data-od-id="surface-profile-links">${topbar("个人链接")}<section class="section" data-control="profile-link-editor"><h2>外部链接</h2><div class="field"><label for="profile-url">网址</label><input id="profile-url" type="url" value="${escapeHtml(state.drafts.profileUrl)}" placeholder="https://" aria-describedby="url-help"><p id="url-help" class="meta">只接受不含凭据的 http / https 地址。</p>${valid ? "" : '<p class="inline-note risk" role="alert">链接格式或协议不可用；草稿已保留。</p>'}</div></section><section class="section" data-control="profile-link-open-copy"><button class="action-row" type="button" data-action="profile-open"><span><strong>尝试打开</strong><small>外部链接打开暂不可用</small></span>${icon("link")}</button><button class="action-row" type="button" data-action="profile-copy"><span><strong>复制链接</strong><small>打开受限时仍可使用</small></span>${icon("share")}</button></section>${sharedOverlays()}</section>`;
  }

  function importPage() {
    const rightsReady = state.importRights.has("source") && state.importRights.has("publish");
    return `<section class="app-page document-page" data-surface="miniapp-profile-content" data-route="content/import" data-od-id="surface-content-import">${topbar("内容导入")}<section class="section" data-control="import-source-rights"><h2>来源与权利</h2><div class="field"><label for="import-source">来源网址</label><input id="import-source" type="url" value="${escapeHtml(state.drafts.importSource)}" placeholder="https://"></div><label class="check-row"><input type="checkbox" data-import-right="source" ${state.importRights.has("source") ? "checked" : ""}><span>我有权使用原始内容</span></label><label class="check-row"><input type="checkbox" data-import-right="publish" ${state.importRights.has("publish") ? "checked" : ""}><span>我同意内容进入审核</span></label></section><section class="section" data-control="import-draft-editor"><h2>编辑草稿</h2><div class="field"><label for="import-body">正文</label><textarea id="import-body">${escapeHtml(state.drafts.importBody)}</textarea><p class="meta">解析不可用时保留已编辑内容，不自动覆盖。</p></div></section><section class="section" data-control="import-spot-association"><h2>关联地点</h2><label class="radio-row"><input type="radio" name="import-spot" checked><span>关联 ${escapeHtml(currentSpot().name)}</span></label><label class="radio-row"><input type="radio" name="import-spot"><span>不关联正式地点</span></label><label class="radio-row"><input type="radio" name="import-spot"><span>作为地点提议送审</span></label></section><section class="section" data-control="import-preview-submit"><h2>预览并提交</h2><p class="body-copy">提交只创建待审核记录，不发布内容，也不创建正式观星点。</p>${rightsReady ? "" : '<p class="inline-note risk" role="status">完成两项权利声明后才能提交。</p>'}<button class="btn commit" type="button" data-action="import-submit" ${rightsReady ? "" : "disabled"}>提交审核</button></section>${sharedOverlays()}</section>`;
  }

  function renderProfile() {
    return state.route === "content/import" ? importPage() : profileLinks();
  }

  function renderContribution() {
    const status = state.contributionSubmitted ? "待审核" : (["pending", "approved", "rejected"].includes(state.general) ? { pending: "待审核", approved: "已通过", rejected: "未通过" }[state.general] : "尚未提交");
    const needsLocation = state.contributionOrigin === "my" && state.contributionSpotMode === "new" && state.contributionKind === "proposal";
    const topicError = state.contributionTouched.has("topics") && state.contributionTopics.size === 0;
    const evidenceError = state.contributionTouched.has("evidence") && !state.drafts.evidence.trim();
    const locationError = state.contributionTouched.has("location") && needsLocation && !state.contributionLocationConsent;
    const rightsError = state.contributionTouched.has("rights") && state.contributionMedia.length > 0 && !state.contributionMediaRights;
    const context = state.contributionOrigin === "panel"
      ? `<div class="field-cell"><span class="cell-label">正式观星点</span><span>${escapeHtml(currentSpot().name)}</span></div>`
      : `<div class="field-cell"><span class="cell-label">地点</span><div class="context-choice" role="radiogroup" aria-label="投稿地点上下文">${[["select", "选择观星点"], ["new", "新地点"]].map(([value, label]) => `<button class="compact-choice-hit" type="button" data-action="contribution-context" data-value="${value}" role="radio" aria-checked="${state.contributionSpotMode === value}"><span class="compact-choice-face">${label}</span></button>`).join("")}</div></div>`;
    const mediaItems = state.contributionMedia.map(item => `<div class="media-cell${item.status === "failed" ? " failed" : ""}" data-media-id="${item.id}">${icon(item.status === "failed" ? "alert" : "upload")}<strong>${item.status === "failed" ? "上传失败" : item.status === "uploading" ? "上传中" : "已就绪"}</strong>${item.status === "uploading" ? `<div class="progress-track" role="progressbar" aria-label="照片上传进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.progress}"><i style="--progress:${item.progress}%"></i></div>` : ""}<div class="media-cell-actions">${item.status === "failed" ? `<button type="button" data-action="media-retry" data-media-id="${item.id}">重试</button>` : ""}<button type="button" data-action="media-remove" data-media-id="${item.id}">移除</button></div></div>`).join("");
    return `<section class="app-page document-page contribution-page" data-surface="miniapp-contribution-intake" data-route="content/contribution/index" data-od-id="surface-contribution">${topbar("观星点信息提交")}<form class="contribution-form" novalidate><section class="section" data-control="contribution-kind-control" data-od-id="contribution-kind-control"><div class="complex-field"><label id="kind-label">提交类型</label><div class="compact-choice-grid" role="radiogroup" aria-labelledby="kind-label">${[["condition", "现场状况"], ["proposal", "地点提议"], ["feedback", "信息纠错"]].map(([value, label]) => `<button class="compact-choice-hit" type="button" data-action="contribution-kind-choice" data-value="${value}" role="radio" aria-checked="${state.contributionKind === value}"><span class="compact-choice-face">${label}</span></button>`).join("")}</div></div></section><section class="section" data-control="contribution-spot-context" data-od-id="contribution-spot-context">${context}</section><section class="section" data-control="contribution-topic-control" data-od-id="contribution-topic-control"><div class="complex-field"><label id="topic-label">影响主题</label><div class="compact-choice-grid" role="group" aria-labelledby="topic-label" aria-describedby="${topicError ? "topic-error" : ""}">${["路况", "开放状态", "光环境", "设施"].map(value => `<button class="compact-choice-hit" type="button" data-action="contribution-topic" data-value="${value}" role="checkbox" aria-checked="${state.contributionTopics.has(value)}"><span class="compact-choice-face">${value}</span></button>`).join("")}</div>${topicError ? '<p id="topic-error" class="field-error" role="alert">至少选择一个受影响主题。</p>' : ""}</div><div class="field-cell" data-control="contribution-observed-at" data-od-id="contribution-observed-at"><label for="observed-at">观察时间</label><input id="observed-at" type="datetime-local" value="${escapeHtml(state.drafts.observedAt)}"></div></section><section class="section"><div class="complex-field"><label for="contribution-evidence">简要说明</label><textarea id="contribution-evidence" aria-describedby="${evidenceError ? "evidence-error" : ""}" placeholder="说明看到的情况与影响">${escapeHtml(state.drafts.evidence)}</textarea>${evidenceError ? '<p id="evidence-error" class="field-error" role="alert">请填写可供审核的简要说明。</p>' : ""}</div></section><section class="section" data-control="contribution-location-consent" data-od-id="contribution-location-consent" ${needsLocation ? "" : "hidden"}><div class="complex-field"><label>位置使用</label><label class="check-row"><input type="checkbox" id="location-consent" ${state.contributionLocationConsent ? "checked" : ""} aria-describedby="${locationError ? "location-error" : ""}"><span>同意仅为本次新地点提议使用精确位置</span></label>${locationError ? '<p id="location-error" class="field-error" role="alert">新地点提议需要本次位置使用同意。</p>' : ""}</div><div class="field-cell"><span class="cell-label">精确位置</span><span>暂无数据</span></div></section><section class="section" data-control="contribution-media-upload" data-od-id="contribution-media-upload"><div class="complex-field"><label>照片与权利</label><div class="media-grid">${mediaItems}${state.contributionMedia.length < 3 ? `<button class="media-cell" type="button" data-action="media-add">${icon("upload")}<span>选择照片</span></button>` : ""}</div>${state.contributionMedia.length ? `<label class="check-row"><input type="checkbox" id="media-rights" ${state.contributionMediaRights ? "checked" : ""} aria-describedby="${rightsError ? "rights-error" : ""}"><span>我有权提交这些照片，并同意移除位置等元数据</span></label>${rightsError ? '<p id="rights-error" class="field-error" role="alert">提交照片前需要确认媒体权利。</p>' : ""}` : '<p class="meta">照片可留空；如添加，将与本次草稿一同保留。</p>'}</div></section><section class="section contribution-submit-wrap" data-control="contribution-submit" data-od-id="contribution-submit"><button class="btn commit" type="submit" data-action="contribution-submit" ${state.contributionSubmitting || state.contributionSubmitted ? "disabled" : ""}>${state.contributionSubmitted ? "已提交" : state.contributionSubmitting ? "正在提交" : "提交审核"}</button></section><section class="section" data-control="contribution-status-list" data-od-id="contribution-status-list"><h2>我的提交</h2><div class="info-row"><span>当前状态</span><span class="status-tag">${status}</span></div><p class="meta">提交后等待审核；审核结果不会自动修改公开事实。</p></section></form>${sharedOverlays()}</section>`;
  }

  function renderPanel() {
    const spot = currentSpot();
    const status = stateStatus();
    const showMedia = Boolean(spot.image) && state.theme !== "observation";
    const panelShown = state.bottomPresentation === "spot-panel";
    const statusLine = status ? `<p class="inline-note ${status[1]}">${icon(status[1] === "risk" ? "alert" : "info")}<span>${status[0]}</span></p>` : "";
    const media = showMedia ? `<div class="panel-media" data-control="spot-media-gallery" data-od-id="spot-media-gallery"><img src="${spot.image}" width="480" height="300" alt="东灵山步道山地实景"></div>` : "";
    const handleSemantics = panelExtentA11y(state.panelExtent);
    return `<section class="spot-panel" data-control="map-spot-information-panel" data-od-id="map-spot-information-panel" data-extent="${state.panelExtent}" data-has-media="${showMedia}" aria-label="${escapeHtml(spot.name)}信息面板" aria-hidden="${!panelShown}" ${panelShown ? "" : "hidden inert"}><button class="panel-handle" type="button" data-control="map-spot-panel-handle" data-od-id="map-spot-panel-handle" aria-label="${handleSemantics.label}" aria-valuemin="0" aria-valuemax="2" aria-valuenow="${handleSemantics.now}" aria-valuetext="${handleSemantics.value}"><span class="panel-handle-hot" data-handle-drag aria-hidden="true"></span></button><div class="panel-extent-actions sr-only" aria-label="信息面板高度"><button type="button" data-action="panel-extent" data-extent="small">显示小档信息</button><button type="button" data-action="panel-extent" data-extent="medium">显示中档信息</button><button type="button" data-action="panel-extent" data-extent="large">显示全屏信息</button></div><div class="panel-document" data-panel-scroll data-document-identity="objective-spot-document">${media}<div class="panel-handle-band" aria-hidden="true"></div><div class="panel-identity-block"><div class="panel-identity"><h2>${escapeHtml(spot.name)}</h2></div><p class="body-copy">距出发地约 38 公里 · 山地步道</p><p class="meta">夜间开放：暂无数据 · 停车：暂无数据</p>${statusLine}</div><section class="panel-section" id="panel-overview" tabindex="-1"><h3>基本信息</h3><div class="panel-rows"><div class="info-row"><span>${icon("route")}预计到达</span><span class="mono">42 分钟</span></div><div class="info-row"><span>${icon("parking")}停车区</span><span>暂无数据</span></div><div class="info-row"><span>夜间开放</span><span>暂无数据</span></div></div><div class="risk-strip">${icon("alert")}<span>末段道路可能湿滑，出发前检查路况。</span></div><div class="panel-rows"><button class="action-row" type="button" data-control="spot-navigation-action" data-action="external-route"><span><strong>查看路线</strong><small>出发前再次确认末段通行</small></span>${icon("chevron")}</button><button class="action-row" type="button" data-control="spot-contribution-entry" data-action="go-contribution"><span><strong>反馈现场情况</strong><small>携带当前正式观星点</small></span>${icon("chevron")}</button></div>${state.routeNotice ? `<p class="inline-note">${icon("info")}<span>${escapeHtml(state.routeNotice)}</span></p>` : ""}</section>${routeSummary()}<section class="panel-section" data-control="spot-facility-evidence" data-od-id="spot-facility-evidence"><h3>设施与安全</h3><div class="panel-rows"><div class="info-row"><span>停车区</span><span>暂无数据</span></div><div class="info-row"><span>补给点</span><span>暂无数据</span></div><div class="info-row"><span>夜间开放</span><span>暂无数据</span></div></div></section><section class="panel-section" data-control="guide-article-viewer" data-od-id="guide-article-viewer"><h3>现场指南</h3><p class="body-copy">抵达后先确认停车与步行边界，再布置三脚架。</p><button class="action-row" type="button" data-action="guide-toggle" aria-expanded="${state.guideOpen}"><span><strong>${state.guideOpen ? "收起指南" : "查看完整指南"}</strong><small>停车、步行与架设顺序</small></span>${icon("chevron")}</button>${state.guideOpen ? '<p class="body-copy">保持道路通行，使用已开放步行段；返程前确认照明、电量与同行人状态。</p>' : ""}${sourceDisclosure("地点、路线与设施")}</section><section class="panel-section" id="panel-astronomy" tabindex="-1"><h3>天文信息</h3>${skyPreview()}<p class="body-copy">猎户座于 22:10 后升高，木星位于东侧；方位需由设备能力复核。</p></section><section class="panel-section">${renderRuler("sky-time-scrubber", "观星点天文时间")}</section><section class="panel-section" data-control="sky-professional-matrix" data-od-id="sky-professional-matrix"><h3>核心观测条件</h3>${matrix()}</section><section class="panel-section" data-control="sky-target-list" data-od-id="sky-target-list"><h3>可观测目标</h3><div class="panel-rows"><div class="info-row"><span>猎户座</span><span>22:10 后升高</span></div><div class="info-row"><span>木星</span><span>东侧可找寻</span></div><div class="info-row"><span>昴星团</span><span>暂无数据</span></div></div></section><section class="panel-section">${sourceDisclosure("天气与天文")}</section></div><nav class="panel-rail" data-control="map-spot-panel-section-nav" data-od-id="map-spot-panel-section-nav" aria-label="信息章节"><button type="button" data-action="panel-section" data-section="overview" aria-current="${state.panelSection === "overview"}"><span>概览</span></button><button type="button" data-action="panel-section" data-section="astronomy" aria-current="${state.panelSection === "astronomy"}"><span>天文</span></button></nav><div class="panel-actions" data-control="map-spot-panel-action-bar" data-od-id="map-spot-panel-action-bar"><button type="button" data-control="spot-favorite-action" data-od-id="spot-favorite-action" data-action="favorite" aria-pressed="${state.favorite}" aria-label="${state.favorite ? "取消想去" : "标记想去"}"><svg class="ui-icon favorite-main" viewBox="0 0 24 24" aria-hidden="true">${iconPaths.star}</svg><span>想去</span><i class="favorite-effect" aria-hidden="true"><i class="favorite-satellite"></i><i class="favorite-satellite"></i><i class="favorite-satellite"></i></i></button><button type="button" data-control="spot-share-action" data-od-id="spot-share-action" data-action="share">${icon("share")}<span>分享</span></button><button type="button" data-control="spot-cloud-stargazing-action" data-od-id="spot-cloud-stargazing-action" data-action="cloud">${icon("telescope")}<span>云观星</span></button></div><p class="sr-only" data-favorite-error role="alert">${escapeHtml(state.favoriteError)}</p></section>`;
  }

  function layerArtwork(value) {
    if (value === "LIGHT") return `<svg class="layer-art" viewBox="0 0 212 128" aria-hidden="true"><rect width="212" height="128" class="layer-art-base"></rect><path class="layer-art-meteor" d="M0 104C35 82 64 96 94 76s71-15 118-51v103H0Z"></path><circle class="layer-art-sky" cx="152" cy="42" r="30"></circle><path class="layer-art-line" d="M0 91c43-19 72 5 111-19s64-25 101-45"></path></svg>`;
    if (value === "TOTAL_CLOUD") return `<svg class="layer-art" viewBox="0 0 212 128" aria-hidden="true"><rect width="212" height="128" class="layer-art-base"></rect><path class="layer-art-cloud" d="M-12 88c20-31 53-35 76-12 12-31 60-37 78-2 34-12 64 8 82 36H-12Z"></path><path class="layer-art-line" d="M10 48c39-17 73-14 99 7s56 24 94 5"></path></svg>`;
    return `<svg class="layer-art" viewBox="0 0 212 128" aria-hidden="true"><rect width="212" height="128" class="layer-art-base"></rect><path class="layer-art-trail" d="M-8 112C43 98 63 62 104 68s55 35 116-35"></path><path class="layer-art-line" d="M0 98Q106 34 212 98M22 109Q106 63 190 109"></path><circle class="layer-art-meteor-dot" cx="151" cy="55" r="7"></circle></svg>`;
  }

  function renderLayerSheetCurrent() {
    const items = [["LIGHT", "光污染", "3 级", "moon"], ["TOTAL_CLOUD", "总云量", "18%", "cloud"], ["OPPORTUNITY", "观测机会", "条件可见", "target"]];
    const active = { LIGHT: "光污染 3 级", TOTAL_CLOUD: "总云量 18%", OPPORTUNITY: "观测机会条件可见" }[state.layer];
    const open = state.bottomPresentation === "layer-sheet";
    return `<section class="layer-sheet" data-control="map-layer-selector" data-od-id="map-layer-selector-sheet" data-open="${open}" data-closing="${state.layerClosing}" aria-label="地图图层" aria-hidden="${!open}" ${open ? "" : "hidden inert"}><header class="layer-sheet-head"><h2>地图图层</h2><p class="layer-summary"><span>${active}</span><time class="mono">${timeline[state.timeIndex].label}</time></p></header>${renderRuler("map-time-control", "地图图层时间")}<div class="layer-choices" data-control="map-analysis-focus-layer" data-od-id="map-analysis-focus-layer" role="radiogroup" aria-label="分析图层">${items.map(([value, label, metric, iconName]) => `<button class="layer-choice" type="button" data-action="layer-select" data-value="${value}" role="radio" aria-checked="${state.layer === value}" tabindex="${state.layer === value ? "0" : "-1"}">${layerArtwork(value)}<span class="layer-choice-copy">${icon(iconName)}<strong>${label}</strong><small>${metric}</small></span></button>`).join("")}</div></section>`;
  }

  function renderMap() {
    const selectedId = state.currentSpotId;
    const markers = spots.map((spot, index) => `<button class="marker marker-${["one", "two", "three"][index]}" type="button" data-action="marker" data-spot="${spot.id}" aria-label="打开${escapeHtml(spot.name)}信息" aria-pressed="${selectedId === spot.id}"></button>`).join("");
    const activeLayer = { LIGHT: "光污染", TOTAL_CLOUD: "总云量", OPPORTUNITY: "观测机会" }[state.layer];
    const layerOpen = state.bottomPresentation === "layer-sheet";
    return `<section class="app-page map-page" data-surface="miniapp-map-discovery" data-route="pages/map/index" data-bottom-presentation="${state.bottomPresentation}" data-od-id="surface-map-discovery"><div class="map-scene" data-control="map-marker-panel-coordinator" data-action="map-space" aria-label="地图空白区域">${mapSvg()}${markers}<div class="search-anchor map-search-entry"><button class="search-frame" type="button" data-control="map-search-entry" data-action="go-search" data-od-id="map-search-entry" aria-label="搜索观星点"><span class="search-slot search-leading-search">${icon("search")}</span><span class="search-slot search-leading-back">${icon("back")}</span><span class="search-query">${state.query ? escapeHtml(state.query) : "搜索观星点"}</span></button></div><div class="map-edge"><button class="icon-button surface" type="button" data-control="map-location-control" data-action="location" aria-label="使用一次当前位置">${icon("location")}</button><button class="icon-button surface layer-trigger" type="button" data-control="map-layer-selector" data-action="layer-toggle" aria-label="选择地图图层" aria-expanded="${layerOpen}" aria-pressed="${layerOpen}">${icon("layers")}</button></div><div class="map-legend" aria-label="当前图层 ${activeLayer}"><span>${activeLayer}</span><i class="legend-scale" aria-hidden="true"></i></div>${renderPanel()}${renderLayerSheetCurrent()}</div>${primaryNav("map")}${sharedOverlays()}</section>`;
  }

  function resultCard(spot) {
    const hasMedia = Boolean(spot.image) && state.theme !== "observation";
    const media = hasMedia ? `<img class="result-media" src="${spot.image}" width="480" height="300" alt="东灵山步道山地实景">` : "";
    return `<button class="result-card${hasMedia ? " has-image" : ""}" type="button" data-control="spot-search-result-card" data-action="result" data-spot="${spot.id}" aria-label="${escapeHtml(spot.name)}，${escapeHtml(spot.meta)}">${media}<span class="result-copy"><strong>${escapeHtml(spot.name)}</strong><span>${escapeHtml(spot.city)}</span><span>${escapeHtml(spot.meta)}</span></span></button>`;
  }

  function renderSearchPartition(key, title, items, emptyCopy, city) {
    const expanded = state.partitions[key];
    const bodyId = `partition-${key}-body`;
    return `<section class="partition" data-partition-key="${key}"><button class="partition-header" type="button" data-action="partition" data-partition="${key}" aria-expanded="${expanded}" aria-controls="${bodyId}"><strong>${title}</strong><span>${items.length}</span>${icon("down")}</button><div id="${bodyId}" class="partition-body" data-partition-body aria-hidden="${!expanded}" ${expanded ? "" : "inert"} style="height:${expanded ? "auto" : "0px"}"><div class="partition-inner">${city ? `<p class="partition-city">${city}</p>` : ""}<div class="result-stack">${items.map(resultCard).join("") || `<p class="meta">${emptyCopy}</p>`}</div></div></div></section>`;
  }

  function renderSearch() {
    const normalized = state.query.trim().toLowerCase();
    const filtered = spots.filter(spot => !normalized || `${spot.name}${spot.city}`.toLowerCase().includes(normalized));
    const wanted = filtered.filter(spot => spot.group === "wanted");
    const other = filtered.filter(spot => spot.group === "other");
    const suggestions = spots.slice(0, 2).map(spot => `<button type="button" data-action="suggestion" data-spot="${spot.id}" role="option">${icon("search")}<span>${escapeHtml(spot.name)}</span></button>`).join("");
    const filterChoices = [["低光害", "moon"], ["可停车", "parking"], ["少步行", "foot"], ["有实景", "map"]].map(item => filterChoice(item[0], item[1])).join("");
    return `<section class="app-page search-page" data-surface="miniapp-map-discovery" data-route="spot/search" data-control="spot-search-shell" data-od-id="surface-spot-search" data-suggestions-open="${state.suggestionsOpen}"><div class="search-anchor"><div class="search-frame" data-control="spot-search-field" data-od-id="spot-search-field"><span class="search-slot search-leading-search" aria-hidden="true">${icon("search")}</span><button class="search-slot search-leading-back" type="button" data-action="search-back" aria-label="返回地图">${icon("back")}</button><input id="spot-search-input" type="text" inputmode="search" role="searchbox" value="${escapeHtml(state.query)}" placeholder="搜索观星点" autocomplete="off" autofocus aria-label="搜索观星点" aria-controls="search-suggestions" aria-expanded="${state.suggestionsOpen}"></div></div><div id="search-suggestions" class="query-overlay" data-control="spot-search-query-overlay" role="listbox" aria-hidden="${!state.suggestionsOpen}" ${state.suggestionsOpen ? "" : "hidden inert"}>${suggestions}</div><div class="search-content" data-search-content><fieldset class="filter-section" data-control="spot-search-filter-group" data-od-id="spot-search-filter-group"><legend class="sr-only">观星点筛选</legend><div class="filter-group">${filterChoices}</div></fieldset><div data-control="spot-search-result-list" data-od-id="spot-search-result-list">${renderSearchPartition("wanted", "想去", wanted, "已标记地点中没有符合当前条件的结果。", "")}${renderSearchPartition("other", "其他观星点", other, "当前查询与筛选没有匹配的正式观星点。", "北京 · 门头沟")}</div></div>${sharedOverlays()}</section>`;
  }

  function sensorCopy() {
    return {
      "permission-required": ["需要方向权限", "允许前台读取设备方向后才能定位天空目标；离开页面即停止读取。"],
      calibrating: ["方向正在校准", "目标位置暂不更新；完成校准后继续跟随。"],
      "low-accuracy": ["方向精度较低", "目标位置可能偏移；远离磁性物体后重新检测。"],
      unavailable: ["设备方向不可用", "当前无法定位目标，可改用文字对象列表和时间尺。"],
      retry: ["方向检测失败", "重试不会保存或上传设备姿态。"]
    }[state.general] || ["", ""];
  }

  function renderOrientation() {
    const sensor = sensorCopy();
    const degraded = ["permission-required", "calibrating", "low-accuracy", "unavailable", "retry"].includes(state.general);
    const spot = currentSpot();
    const listVisible = state.objectListOpen || degraded;
    return `<section class="app-page orientation-page" data-surface="miniapp-sky-orientation" data-route="sky/detail" data-od-id="surface-sky-orientation"><div class="orientation-canvas" data-control="sky-orientation-canvas" data-od-id="sky-orientation-canvas" role="img" aria-label="${escapeHtml(spot.name)} ${timeline[state.timeIndex].label} 方位天空"><svg viewBox="0 0 390 760" preserveAspectRatio="none" aria-hidden="true"><path class="sky-grid" d="M-40 570Q195 260 430 570M35 570Q195 380 355 570M195 80V650M0 480H390"></path><path class="sky-grid" d="M20 640Q195 560 370 640"></path></svg><div class="orientation-field" style="--pose-x:${state.pose.alpha / 7}px;--pose-y:${state.pose.beta / 4}px;--pose-r:${state.pose.gamma / 4}deg"><span class="orientation-object object-one">猎户座</span><span class="orientation-object object-two">木星</span><span class="orientation-object object-three">昴星团</span></div></div><button class="icon-button orientation-back" type="button" data-action="back" aria-label="返回地点信息">${icon("back")}</button><span class="sr-only" data-control="sky-orientation-sensor" aria-live="polite">${degraded ? sensor[0] : "设备方向仅在前台用于更新天空画布"}</span><section class="orientation-list" data-control="sky-orientation-object-list" aria-label="天空对象文字列表" ${listVisible ? "" : "hidden"}><div class="info-row"><span>猎户座</span><span>东南 · 升高中</span></div><div class="info-row"><span>木星</span><span>东侧 · 明亮</span></div><div class="info-row"><span>昴星团</span><span>方位待复核</span></div></section>${degraded ? `<section class="orientation-recovery" data-control="sky-orientation-recovery" role="${state.general === "unavailable" ? "alert" : "status"}"><h2>${sensor[0]}</h2><p class="body-copy">${sensor[1]}</p><div class="button-row"><button class="btn tonal" type="button" data-action="orientation-recover">${icon("retry")}重新检测</button><button class="btn" type="button" data-action="object-list">文字对象列表</button></div></section>` : '<span data-control="sky-orientation-recovery" hidden></span>'}<div class="orientation-ruler">${renderRuler("sky-orientation-time-ruler", "方位天空时间")}</div>${sharedOverlays()}</section>`;
  }

  function myRoot() {
    return `<section class="app-page document-page" data-surface="miniapp-my-library" data-route="pages/my/index" data-od-id="surface-my-library"><header class="account-header" data-control="my-account-header" data-od-id="my-account-header"><span class="avatar">我</span><div class="account-copy"><h1>本机账户</h1><p class="meta">登录状态：暂无数据</p></div><button class="icon-button surface" type="button" data-control="my-settings-action" data-action="go-settings" aria-label="设置">${icon("settings")}</button></header><section class="my-focus-group" data-control="my-profile-summary" data-od-id="my-profile-summary"><div class="profile-band"><div><strong>个人链接</strong><small>暂无数据</small></div><div><strong>待审核内容</strong><small>暂无数据</small></div></div><div class="utility-grid"><button class="utility-entry" type="button" data-control="my-plan-entry" data-action="go-plan"><span class="role-icon sky">${icon("clock")}</span><span><strong>今晚计划</strong><small>地点与出发准备</small></span>${icon("chevron")}</button><button class="utility-entry" type="button" data-control="my-contribution-entry" data-action="go-contribution"><span class="role-icon trail">${icon("upload")}</span><span><strong>观星点信息提交</strong><small>草稿与审核状态</small></span>${icon("chevron")}</button></div></section><section class="section" data-control="my-grouped-entry-list" data-od-id="my-grouped-entry-list"><h2>资料与设置</h2><div class="routine-list"><button class="routine-entry" type="button" data-action="go-profile"><span class="role-icon meteor">${icon("link")}</span><span><strong>个人链接</strong><small>安全打开与复制</small></span>${icon("chevron")}</button><button class="routine-entry" type="button" data-action="go-import"><span class="role-icon neutral">${icon("upload")}</span><span><strong>内容导入</strong><small>权利确认与地点关联</small></span>${icon("chevron")}</button><button class="routine-entry" type="button" data-action="go-settings"><span class="role-icon sky">${icon("settings")}</span><span><strong>显示、权限与隐私</strong><small>三种显示模式与提醒</small></span>${icon("chevron")}</button></div></section>${sourceDisclosure("账户与计划")}${primaryNav("my")}${sharedOverlays()}</section>`;
  }

  function settingsPage() {
    const modes = [["day", "日间"], ["night", "夜间"], ["observation", "观测"]];
    const modeIndex = modes.findIndex(([value]) => value === state.theme);
    return `<section class="app-page document-page" data-surface="miniapp-my-library" data-route="settings" data-od-id="surface-settings">${topbar("设置")}<section class="section" data-control="display-mode-switcher" data-od-id="display-mode-switcher"><h2>显示模式</h2><div class="mode-track" data-mode-track data-value="${state.theme}" style="--mode-position:${modeIndex}" role="radiogroup" aria-label="显示模式"><div class="mode-thumb" aria-hidden="true"><span class="mode-thumb-content"><span class="mode-thumb-icon" data-mode-icon="day">${icon("sun")}</span><span class="mode-thumb-icon" data-mode-icon="night">${icon("moon")}</span><span class="mode-thumb-icon" data-mode-icon="observation">${icon("star", true)}</span><span class="mode-thumb-label">${modes[modeIndex][1]}</span></span></div>${modes.map(([value, label], index) => `<button class="mode-stop" type="button" data-action="product-theme" data-value="${value}" data-index="${index}" role="radio" aria-checked="${state.theme === value}" tabindex="${state.theme === value ? "0" : "-1"}">${icon(value === "day" ? "sun" : value === "night" ? "moon" : "star", value === "observation")}<span>${label}</span></button>`).join("")}</div></section><section class="section" data-control="settings-form" data-od-id="settings-form"><h2>权限、隐私与提醒</h2><button class="switch-row" type="button" data-action="setting-switch" data-key="reminders" role="switch" aria-checked="${state.switches.reminders}"><span>出发条件提醒意向</span><span class="switch-track"><i></i></span></button><button class="switch-row" type="button" data-action="setting-switch" data-key="nightDefault" role="switch" aria-checked="${state.switches.nightDefault}"><span>弱光环境优先夜间显示</span><span class="switch-track"><i></i></span></button><p class="meta">提醒意向需要系统授权后才会生效。</p></section>${sharedOverlays()}</section>`;
  }


  function render() {
    disclosureSequence = 0;
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.motion = state.motion;
    document.documentElement.dataset.transparency = state.transparency;
    document.documentElement.dataset.textScale = String(state.textScale);
    phone.dataset.viewport = String(state.viewport);
    let html = "";
    if (state.surface === "miniapp-map-discovery") html = state.route === "spot/search" ? renderSearch() : renderMap();
    if (state.surface === "miniapp-sky-orientation") html = renderOrientation();
    if (state.surface === "miniapp-my-library") html = renderMy();
    if (state.surface === "miniapp-profile-content") html = renderProfile();
    if (state.surface === "miniapp-contribution-intake") html = renderContribution();
    root.innerHTML = html;
    root.dataset.auditState = state.general;
    lockMapSceneOrigin();
    if (state.general === "disabled") root.querySelectorAll(".btn.commit").forEach(button => button.disabled = true);
    applyStablePanelPresentation();
    syncAudit();
    updateAllRulers(state.timeIndex);
    updatePose();
    if (state.general === "focused") requestAnimationFrame(() => focusWithoutScroll(root.querySelector("input, button, [tabindex='0']")));
  }

  function syncAudit() {
    surfaceSelect.value = state.surface;
    const options = routes[state.surface];
    routeSelect.innerHTML = options.map(item => `<option value="${item.value}">${item.label}</option>`).join("");
    routeSelect.value = state.route;
    stateSelect.value = state.general;
    document.querySelectorAll(".audit-panel button[data-theme-value]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.themeValue === state.theme)));
    document.querySelectorAll(".audit-panel button[data-viewport]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.viewport) === state.viewport)));
    document.querySelectorAll(".audit-panel button[data-text-scale]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.textScale) === state.textScale)));
    document.querySelectorAll(".audit-panel button[data-motion-value]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.motionValue === state.motion)));
    document.querySelectorAll(".audit-panel button[data-transparency-value]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.transparencyValue === state.transparency)));
    auditCurrent.textContent = `${state.surface} · ${state.route} · ${state.general} · ${state.theme} · ${state.viewport}px · ${state.textScale}% · ${state.motion}`;
  }

  function updateRulerElement(element, indexFloat) {
    const nearest = Math.max(0, Math.min(timeline.length - 1, Math.round(indexFloat)));
    element.setAttribute("aria-valuenow", String(nearest));
    element.setAttribute("aria-valuetext", timeline[nearest].label);
    const current = element.closest(".ruler-shell")?.querySelector("[data-ruler-current]");
    if (current) current.textContent = timeline[nearest].label;
    const half = Math.max(1, element.clientWidth / 2);
    element.querySelectorAll(".ruler-tick").forEach(tick => {
      const index = Number(tick.dataset.index);
      const u = Math.min(Math.abs((index - indexFloat) * 17) / half, 1);
      const scale = 1 - .56 * Math.pow(u, 1.2);
      const opacity = 1 - .84 * Math.pow(u, 1.15);
      const offset = 11 * Math.pow(u, 1.55);
      tick.style.opacity = String(opacity);
      tick.style.transform = `translateY(${offset}px) scale(${scale})`;
      tick.classList.toggle("selected", index === nearest);
    });
  }

  function updateAllRulers(indexFloat) {
    root.querySelectorAll("[data-ruler]").forEach(element => {
      element.scrollLeft = indexFloat * 17;
      updateRulerElement(element, indexFloat);
    });
  }

  function updatePose() {
    const field = root.querySelector(".orientation-field");
    if (field) {
      field.style.setProperty("--pose-x", `${state.pose.alpha / 7}px`);
      field.style.setProperty("--pose-y", `${state.pose.beta / 4}px`);
      field.style.setProperty("--pose-r", `${state.pose.gamma / 4}deg`);
    }
    ["alpha", "beta", "gamma"].forEach(key => {
      const output = document.getElementById(`pose-${key}-value`);
      if (output) output.textContent = `${state.pose[key]}°`;
    });
  }

  function announce(message) {
    announcer.textContent = "";
    requestAnimationFrame(() => { announcer.textContent = message; });
  }

  function renderKeepingPanelPosition() {
    const currentScroller = root.querySelector('.spot-panel[data-extent="large"] .panel-document');
    const panelScrollTop = currentScroller?.scrollTop;
    render();
    if (panelScrollTop == null) return;
    root.querySelector('.spot-panel[data-extent="large"] .panel-document')?.scrollTo({ top: panelScrollTop, behavior: "auto" });
  }

  function showNotice(message) {
    state.notice = message;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { state.notice = ""; renderKeepingPanelPosition(); }, 3200);
    renderKeepingPanelPosition();
  }

  function setSearchSuggestionsOpen(open, blurInput) {
    const input = root.querySelector("#spot-search-input");
    const page = root.querySelector(".search-page");
    const overlay = root.querySelector("#search-suggestions");
    state.suggestionsOpen = Boolean(open);
    if (page) page.dataset.suggestionsOpen = String(state.suggestionsOpen);
    if (overlay) {
      overlay.hidden = !state.suggestionsOpen;
      overlay.inert = !state.suggestionsOpen;
      overlay.setAttribute("aria-hidden", String(!state.suggestionsOpen));
    }
    input?.setAttribute("aria-expanded", String(state.suggestionsOpen));
    if (blurInput) input?.blur();
  }

  function closeSearchSuggestions(blurInput) {
    setSearchSuggestionsOpen(false, blurInput);
  }

  function searchHistoryStateWithoutPresentation() {
    if (!history.state || typeof history.state !== "object") return null;
    const next = { ...history.state };
    delete next.odPresentation;
    delete next.odSearchEntry;
    return Object.keys(next).length ? next : null;
  }

  function unwindSearchHistoryEntry() {
    if (!searchHistoryArmed || searchHistoryPopExpected) return;
    searchHistoryPopExpected = true;
    history.back();
    clearTimeout(searchHistoryFallbackTimer);
    searchHistoryFallbackTimer = setTimeout(() => {
      if (!searchHistoryPopExpected) return;
      searchHistoryPopExpected = false;
      searchHistoryArmed = false;
      searchHistoryFallbackDebt += 1;
      history.replaceState(searchHistoryStateWithoutPresentation(), "", searchHistoryBaseUrl || location.href);
    }, 120);
  }

  function finalizeSearchExit() {
    clearTimeout(searchExitTimer);
    searchExitTimer = null;
    if (!searchExitInFlight && state.route !== "spot/search") return;
    searchExitInFlight = false;
    searchHistoryArmed = false;
    searchSuppressCompositionReopen = false;
    searchDeferredCompositionCommit = false;
    navigate("miniapp-map-discovery", "pages/map/index");
  }

  function exitSearch(unwindHistory) {
    if (state.route !== "spot/search" || searchExitInFlight) return;
    searchExitInFlight = true;
    searchEdgeDrag = null;
    const page = root.querySelector(".search-page");
    searchSuppressCompositionReopen = searchComposing;
    closeSearchSuggestions(true);
    if (unwindHistory) unwindSearchHistoryEntry();
    else searchHistoryArmed = false;
    if (!page || state.motion === "reduced") return finalizeSearchExit();
    page.dataset.exiting = "true";
    searchExitTimer = setTimeout(finalizeSearchExit, 160);
  }

  function openSearch() {
    if (!searchHistoryArmed) {
      searchHistoryBaseUrl = location.href;
      const presentationUrl = new URL(location.href);
      presentationUrl.hash = `od-spot-search-${++searchHistoryEntryId}`;
      history.pushState({ ...(history.state && typeof history.state === "object" ? history.state : {}), odPresentation: "spot-search", odSearchEntry: searchHistoryEntryId }, "", presentationUrl.href);
      searchHistoryArmed = true;
    }
    setSearchSuggestionsOpen(true, false);
    navigate("miniapp-map-discovery", "spot/search");
    requestAnimationFrame(() => focusWithoutScroll(root.querySelector("#spot-search-input")));
  }

  function requestSearchExit() {
    exitSearch(searchHistoryArmed);
  }

  function hidePanelAnimated() {
    const panel = root.querySelector(".spot-panel");
    if (!panel || state.bottomPresentation !== "spot-panel" || state.motion === "reduced") {
      state.bottomPresentation = "none";
      render();
      return;
    }
    panel.dataset.closing = "true";
    panel.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      state.bottomPresentation = "none";
      render();
      announce("点位信息面板已隐藏");
    }, 220);
  }

  function openLayerSheet() {
    if (state.bottomPresentation === "layer-sheet") return;
    state.layerRestorePending = state.bottomPresentation === "spot-panel";
    state.panelPreviousExtent = state.panelExtent;
    state.layerClosing = false;
    state.bottomPresentation = "layer-sheet";
    const sheet = root.querySelector(".layer-sheet");
    const panel = root.querySelector(".spot-panel");
    const page = root.querySelector(".map-page");
    const trigger = root.querySelector("[data-action='layer-toggle']");
    if (page) page.dataset.bottomPresentation = "layer-sheet";
    if (panel) { panel.hidden = true; panel.inert = true; panel.setAttribute("aria-hidden", "true"); }
    if (sheet) { sheet.hidden = false; sheet.inert = false; sheet.dataset.open = "true"; sheet.dataset.closing = "false"; sheet.setAttribute("aria-hidden", "false"); }
    if (trigger) { trigger.setAttribute("aria-expanded", "true"); trigger.setAttribute("aria-pressed", "true"); }
    if (!layerHistoryArmed) {
      history.pushState({ odPresentation: "layer-sheet" }, "", location.href);
      layerHistoryArmed = true;
    }
    requestAnimationFrame(() => focusWithoutScroll(sheet?.querySelector(".layer-choice[aria-checked='true']")));
  }

  function closeLayerSheet(fromHistory) {
    const sheet = root.querySelector(".layer-sheet");
    if (!sheet || state.bottomPresentation !== "layer-sheet") return;
    layerHistoryArmed = false;
    const restorePanel = state.layerRestorePending && Boolean(state.currentSpotId);
    if (state.motion === "reduced") {
      state.bottomPresentation = restorePanel ? "spot-panel" : "none";
      state.panelExtent = restorePanel ? state.panelPreviousExtent : state.panelExtent;
      state.layerRestorePending = false;
      sheet.hidden = true;
      sheet.inert = true;
      const panel = root.querySelector(".spot-panel");
      if (panel) { panel.hidden = !restorePanel; panel.inert = !restorePanel; panel.dataset.extent = state.panelExtent; panel.setAttribute("aria-hidden", String(!restorePanel)); }
      const page = root.querySelector(".map-page");
      if (page) page.dataset.bottomPresentation = state.bottomPresentation;
      const trigger = root.querySelector("[data-action='layer-toggle']");
      if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.setAttribute("aria-pressed", "false"); }
      applyStablePanelPresentation();
      requestAnimationFrame(() => focusWithoutScroll(trigger));
      return;
    }
    state.layerClosing = true;
    sheet.dataset.closing = "true";
    setTimeout(() => {
      state.layerClosing = false;
      state.bottomPresentation = restorePanel ? "spot-panel" : "none";
      state.panelExtent = restorePanel ? state.panelPreviousExtent : state.panelExtent;
      state.layerRestorePending = false;
      sheet.hidden = true;
      sheet.inert = true;
      sheet.dataset.open = "false";
      sheet.dataset.closing = "false";
      const panel = root.querySelector(".spot-panel");
      if (panel) { panel.hidden = !restorePanel; panel.inert = !restorePanel; panel.dataset.extent = state.panelExtent; panel.setAttribute("aria-hidden", String(!restorePanel)); }
      const page = root.querySelector(".map-page");
      if (page) page.dataset.bottomPresentation = state.bottomPresentation;
      const trigger = root.querySelector("[data-action='layer-toggle']");
      if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.setAttribute("aria-pressed", "false"); }
      applyStablePanelPresentation();
      requestAnimationFrame(() => focusWithoutScroll(trigger));
    }, 180);
  }

  function requestLayerClose() {
    if (layerHistoryArmed) history.back();
    else closeLayerSheet(false);
  }

  function navigate(surface, route) {
    const nextRoute = route || routes[surface][0].value;
    if (state.route === "spot/search" && nextRoute !== "spot/search" && searchHistoryArmed && !searchExitInFlight) unwindSearchHistoryEntry();
    state.surface = surface;
    state.route = nextRoute;
    if (nextRoute !== "spot/search") setSearchSuggestionsOpen(false, false);
    state.bottomPresentation = nextRoute === "pages/map/index" ? state.bottomPresentation : "none";
    layerHistoryArmed = false;
    state.layerClosing = false;
    render();
  }

  function back() {
    if (state.bottomPresentation === "layer-sheet") return requestLayerClose();
    if (state.route === "spot/search") return requestSearchExit();
    if (state.surface === "miniapp-map-discovery" && state.route === "pages/map/index" && state.bottomPresentation === "spot-panel") {
      if (state.evidenceOpen) { state.evidenceOpen = false; renderKeepingPanelPosition(); return; }
      if (state.panelExtent === "large") { applyPanelExtent("medium"); return; }
      if (state.panelExtent === "medium") { applyPanelExtent("small"); return; }
      return hidePanelAnimated();
    }
    if (state.surface === "miniapp-sky-orientation") {
      state.bottomPresentation = "spot-panel";
      state.panelExtent = "medium";
      return navigate("miniapp-map-discovery", "pages/map/index");
    }
    if (["plan/detail", "settings"].includes(state.route)) return navigate("miniapp-my-library", "pages/my/index");
    if (state.surface === "miniapp-profile-content") return navigate("miniapp-my-library", "pages/my/index");
    if (state.surface === "miniapp-contribution-intake") {
      state.bottomPresentation = state.contributionOrigin === "panel" && state.currentSpotId ? "spot-panel" : "none";
      state.panelExtent = "medium";
      return navigate(state.contributionOrigin === "panel" ? "miniapp-map-discovery" : "miniapp-my-library", state.contributionOrigin === "panel" ? "pages/map/index" : "pages/my/index");
    }
    navigate("miniapp-map-discovery", "pages/map/index");
  }

  function selectSpot(id) {
    const fromOpenLayer = state.route === "pages/map/index" && state.bottomPresentation === "layer-sheet";
    if (state.route === "spot/search" && searchHistoryArmed) unwindSearchHistoryEntry();
    state.currentSpotId = id;
    state.bottomPresentation = "spot-panel";
    state.layerRestorePending = false;
    state.panelExtent = "medium";
    state.panelSection = "overview";
    state.surface = "miniapp-map-discovery";
    state.route = "pages/map/index";
    setSearchSuggestionsOpen(false, false);
    searchHistoryArmed = false;
    if (fromOpenLayer) {
      const sheet = root.querySelector(".layer-sheet");
      if (sheet) { sheet.hidden = true; sheet.inert = true; sheet.setAttribute("aria-hidden", "true"); }
      const existingPanel = root.querySelector(".spot-panel");
      if (existingPanel) existingPanel.outerHTML = renderPanel();
      root.querySelectorAll(".marker").forEach(marker => marker.setAttribute("aria-pressed", String(marker.dataset.spot === id)));
      const page = root.querySelector(".map-page");
      if (page) page.dataset.bottomPresentation = "spot-panel";
      const trigger = root.querySelector("[data-action='layer-toggle']");
      if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.setAttribute("aria-pressed", "false"); }
      if (layerHistoryArmed) { layerHistoryPopExpected = true; history.back(); }
      layerHistoryArmed = false;
      applyStablePanelPresentation();
      requestAnimationFrame(() => announce(`${currentSpot().name}已选择，已打开中档信息`));
      return;
    }
    render();
    requestAnimationFrame(() => announce(`${currentSpot().name}已选择，已打开中档信息`));
  }

  function panelProgressForExtent(extent) {
    return { small: 0, medium: .5, large: 1 }[extent] ?? 0;
  }

  function setPanelPresentation(progress) {
    const bounded = Math.max(0, Math.min(1, progress));
    const scene = root.querySelector(".map-scene");
    const search = root.querySelector(".map-search-entry");
    const edge = root.querySelector(".map-edge");
    const panel = root.querySelector(".spot-panel");
    if (scene) scene.style.setProperty("--panel-progress", String(bounded));
    const chromeOpacity = 1 - Math.max(0, Math.min(1, (bounded - .82) / .12));
    [search, edge].forEach(chrome => {
      if (!chrome) return;
      const inert = chromeOpacity <= .08;
      chrome.style.opacity = String(chromeOpacity);
      chrome.style.pointerEvents = inert ? "none" : "auto";
      chrome.setAttribute("aria-hidden", String(inert));
      chrome.inert = inert;
    });
    if (panel) {
      panel.style.setProperty("--panel-progress", String(bounded));
      const media = panel.querySelector(".panel-media");
      const handleBand = panel.querySelector(".panel-handle-band");
      if (media) {
        const appHeight = Math.max(0, root.getBoundingClientRect().height - 62);
        const fullHeight = Math.max(150, Math.min(210, appHeight * .27));
        const phase = Math.max(0, Math.min(1, (bounded - .50) / .28));
        media.style.height = `${fullHeight * phase}px`;
        media.style.opacity = String(phase);
        media.dataset.revealed = String(phase > 0);
        panel.style.setProperty("--handle-band-height", `${20 * (1 - phase)}px`);
      } else {
        panel.style.setProperty("--handle-band-height", "20px");
      }
      if (handleBand) handleBand.setAttribute("aria-hidden", "true");
    }
    lockMapSceneOrigin();
  }

  function applyStablePanelPresentation() {
    cancelAnimationFrame(panelPresentationFrame);
    panelPresentationFrame = null;
    setPanelPresentation(state.bottomPresentation === "spot-panel" ? panelProgressForExtent(state.panelExtent) : 0);
  }

  function animatePanelPresentation(from, to) {
    cancelAnimationFrame(panelPresentationFrame);
    if (state.motion === "reduced" || from === to) {
      panelPresentationFrame = null;
      setPanelPresentation(to);
      return;
    }
    const startedAt = performance.now();
    const tick = now => {
      const elapsed = Math.min(1, (now - startedAt) / 260);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setPanelPresentation(from + (to - from) * eased);
      if (elapsed < 1) panelPresentationFrame = requestAnimationFrame(tick);
      else panelPresentationFrame = null;
    };
    panelPresentationFrame = requestAnimationFrame(tick);
  }

  function applyPanelExtent(extent) {
    const from = panelProgressForExtent(state.panelExtent);
    state.panelExtent = extent;
    const panel = root.querySelector(".spot-panel");
    if (!panel) return;
    if (from > panelProgressForExtent(extent)) {
      panel.dataset.presenting = "true";
      setTimeout(() => { if (panel.isConnected) delete panel.dataset.presenting; }, 340);
    }
    panel.dataset.extent = extent;
    syncPanelHandleSemantics(panel, extent);
    animatePanelPresentation(from, panelProgressForExtent(extent));
  }

  function setPanelSection(section, fromKeyboard) {
    applyPanelExtent("large");
    state.panelSection = section;
    root.querySelectorAll("[data-action='panel-section']").forEach(button => button.setAttribute("aria-current", String(button.dataset.section === section)));
    requestAnimationFrame(() => {
      const scroller = root.querySelector(".panel-document");
      const heading = root.querySelector(section === "astronomy" ? "#panel-astronomy" : "#panel-overview");
      if (scroller && heading) {
        scroller.scrollTo({ top: Math.max(0, heading.offsetTop - 4), behavior: state.motion === "reduced" ? "auto" : "smooth" });
        if (fromKeyboard) heading.focus({ preventScroll: true });
      }
    });
  }

  function stepTime(delta) {
    state.timeIndex = Math.max(0, Math.min(timeline.length - 1, state.timeIndex + delta));
    updateAllRulers(state.timeIndex);
    root.querySelectorAll(".layer-summary time").forEach(element => { element.textContent = timeline[state.timeIndex].label; });
    announce(`观测时间 ${timeline[state.timeIndex].label}`);
  }

  function togglePartition(button) {
    const key = button.dataset.partition;
    const partition = button.closest(".partition");
    const body = partition?.querySelector("[data-partition-body]");
    if (!body) return;
    const expanding = !state.partitions[key];
    state.partitions[key] = expanding;
    button.setAttribute("aria-expanded", String(expanding));
    partitionAnimations.get(body)?.cancel();
    const from = body.getBoundingClientRect().height;
    if (expanding) {
      body.inert = false;
      body.setAttribute("aria-hidden", "false");
      body.style.height = "auto";
    }
    const to = expanding ? body.scrollHeight : 0;
    body.style.height = `${from}px`;
    if (state.motion === "reduced") {
      body.style.height = expanding ? "auto" : "0px";
      body.inert = !expanding;
      body.setAttribute("aria-hidden", String(!expanding));
      return;
    }
    const animation = body.animate([{ height: `${from}px`, opacity: from ? 1 : 0 }, { height: `${to}px`, opacity: expanding ? 1 : 0 }], { duration: 160, easing: "cubic-bezier(.2,0,0,1)", fill: "forwards" });
    partitionAnimations.set(body, animation);
    animation.onfinish = () => {
      if (partitionAnimations.get(body) !== animation) return;
      body.style.height = expanding ? "auto" : "0px";
      body.style.opacity = "";
      body.inert = !expanding;
      body.setAttribute("aria-hidden", String(!expanding));
      partitionAnimations.delete(body);
    };
  }

  function selectLayer(button) {
    state.layer = button.dataset.value;
    root.querySelectorAll(".layer-choice").forEach(choice => {
      const selected = choice.dataset.value === state.layer;
      choice.setAttribute("aria-checked", String(selected));
      choice.tabIndex = selected ? 0 : -1;
    });
    const active = { LIGHT: ["光污染", "光污染 3 级"], TOTAL_CLOUD: ["总云量", "总云量 18%"], OPPORTUNITY: ["观测机会", "观测机会条件可见"] }[state.layer];
    const legend = root.querySelector(".map-legend span");
    const summary = root.querySelector(".layer-summary span");
    if (legend) legend.textContent = active[0];
    if (summary) summary.textContent = active[1];
    announce(`地图图层 ${active[0]}`);
    requestLayerClose();
  }

  function selectDisplayMode(requested, advanceCurrent) {
    const modes = ["day", "night", "observation"];
    let nextIndex = modes.indexOf(requested);
    const currentIndex = modes.indexOf(state.theme);
    if (advanceCurrent && nextIndex === currentIndex && nextIndex < modes.length - 1) nextIndex += 1;
    if (nextIndex < 0) return;
    const next = modes[nextIndex];
    document.documentElement.dataset.theme = next;
    state.theme = next;
    const track = root.querySelector("[data-mode-track]");
    if (track) {
      requestAnimationFrame(() => {
        if (!track.isConnected) return;
        track.dataset.value = next;
        track.style.setProperty("--mode-position", String(nextIndex));
        track.querySelectorAll(".mode-stop").forEach((button, index) => {
          button.setAttribute("aria-checked", String(index === nextIndex));
          button.tabIndex = index === nextIndex ? 0 : -1;
        });
        const label = track.querySelector(".mode-thumb-label");
        if (label) label.textContent = ["日间", "夜间", "观测"][nextIndex];
      });
    }
    document.querySelectorAll(".audit-panel button[data-theme-value]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.themeValue === next)));
    syncAudit();
    announce(`显示模式 ${["日间", "夜间", "观测"][nextIndex]}`);
  }

  function addContributionMedia() {
    if (state.contributionMedia.length >= 3) return;
    const id = `local-media-${++state.contributionMediaSequence}`;
    const failed = state.general === "retry";
    state.contributionMedia.push({ id, status: failed ? "failed" : "uploading", progress: failed ? 0 : 36 });
    render();
    if (!failed) settleContributionMedia(id);
  }

  function settleContributionMedia(id) {
    setTimeout(() => {
      const item = state.contributionMedia.find(media => media.id === id);
      if (!item || item.status !== "uploading") return;
      item.progress = 100;
      item.status = "ready";
      render();
      announce("照片已加入草稿");
    }, state.motion === "reduced" ? 0 : 420);
  }

  function retryContributionMedia(id) {
    const item = state.contributionMedia.find(media => media.id === id);
    if (!item) return;
    item.status = "uploading";
    item.progress = 36;
    render();
    settleContributionMedia(id);
  }

  function focusContributionError(selector) {
    requestAnimationFrame(() => {
      const scroller = root.querySelector(".contribution-page");
      const target = root.querySelector(selector);
      if (!scroller || !target) return;
      scroller.scrollTo({ top: Math.max(0, target.offsetTop - 60), behavior: state.motion === "reduced" ? "auto" : "smooth" });
      focusWithoutScroll(target);
    });
  }

  function submitContribution() {
    state.contributionTouched = new Set(["topics", "evidence", "location", "rights", "media"]);
    const needsLocation = state.contributionOrigin === "my" && state.contributionSpotMode === "new" && state.contributionKind === "proposal";
    const mediaBlocking = state.contributionMedia.some(item => item.status !== "ready");
    let invalidSelector = "";
    if (state.contributionTopics.size === 0) invalidSelector = "[data-control='contribution-topic-control'] .compact-choice-hit";
    else if (!state.drafts.evidence.trim()) invalidSelector = "#contribution-evidence";
    else if (needsLocation && !state.contributionLocationConsent) invalidSelector = "#location-consent";
    else if (state.contributionMedia.length && !state.contributionMediaRights) invalidSelector = "#media-rights";
    else if (mediaBlocking) invalidSelector = "[data-control='contribution-media-upload'] .media-cell";
    if (invalidSelector) {
      render();
      focusContributionError(invalidSelector);
      announce("请检查表单中的就地提示");
      return;
    }
    if (state.contributionSubmitting || state.contributionSubmitted) return;
    state.contributionSubmitting = true;
    render();
    setTimeout(() => {
      state.contributionSubmitting = false;
      state.contributionSubmitted = true;
      state.general = "pending";
      render();
      announce("已提交，等待审核");
    }, state.motion === "reduced" ? 0 : 320);
  }

  root.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (!target) {
      if (searchDeferredCompositionCommit && state.route === "spot/search" && !searchExitInFlight) {
        searchDeferredCompositionCommit = false;
        const scrollTop = root.querySelector(".search-content")?.scrollTop || 0;
        render();
        requestAnimationFrame(() => { const scroller = root.querySelector(".search-content"); if (scroller) scroller.scrollTop = scrollTop; });
      }
      return;
    }
    const action = target.dataset.action;
    if (action === "nav-map") navigate("miniapp-map-discovery", "pages/map/index");
    if (action === "nav-my") navigate("miniapp-my-library", "pages/my/index");
    if (action === "back") back();
    if (action === "search-back") requestSearchExit();
    if (action === "go-search") openSearch();
    if (action === "suggestion") selectSpot(target.dataset.spot);
    if (action === "filter") { const value = target.dataset.value; state.filters.has(value) ? state.filters.delete(value) : state.filters.add(value); target.setAttribute("aria-checked", String(state.filters.has(value))); announce(`${value}${state.filters.has(value) ? "已选择" : "已取消"}`); }
    if (action === "partition") togglePartition(target);
    if (action === "result" || action === "marker") selectSpot(target.dataset.spot);
    if (action === "map-space" && mapSpaceClickArmed && !event.target.closest(".spot-panel, .layer-sheet") && event.target.closest("[data-action]") === target) {
      mapSpaceClickArmed = false;
      if (state.bottomPresentation === "layer-sheet") requestLayerClose();
      else if (state.bottomPresentation === "spot-panel") hidePanelAnimated();
    }
    if (action === "location") { state.routeNotice = "位置权限未授权；地图仍可手动浏览，路线起点暂不更新。"; render(); }
    if (action === "layer-toggle") state.bottomPresentation === "layer-sheet" ? requestLayerClose() : openLayerSheet();
    if (action === "layer-select") selectLayer(target);
    if (action === "panel-extent") { applyPanelExtent(target.dataset.extent); announce(`信息面板 ${target.dataset.extent}`); }
    if (action === "panel-section") setPanelSection(target.dataset.section, event.detail === 0);
    if (action === "favorite") {
      if (state.general === "favorite-failure") {
        state.favoriteError = "保存失败，原有想去状态保持不变。";
        const alert = root.querySelector("[data-favorite-error]");
        if (alert) alert.textContent = state.favoriteError;
        announce(state.favoriteError);
      }
      else {
        state.favorite = !state.favorite;
        state.favoriteError = "";
        target.setAttribute("aria-pressed", String(state.favorite));
        target.setAttribute("aria-label", state.favorite ? "取消想去" : "标记想去");
        const alert = root.querySelector("[data-favorite-error]");
        if (alert) alert.textContent = "";
        announce(state.favorite ? "已标记想去" : "已取消想去");
      }
    }
    if (action === "share") showNotice("公开摘要已复制；未包含位置、传感器或未发布内容。");
    if (action === "cloud") navigate("miniapp-sky-orientation", "sky/detail");
    if (action === "external-route") { state.routeNotice = "路线服务暂不可用；地点与时间保持不变。"; renderKeepingPanelPosition(); }
    if (action === "go-contribution") {
      state.contributionOrigin = state.surface === "miniapp-map-discovery" ? "panel" : "my";
      if (state.contributionOrigin === "my") state.contributionSpotMode = "select";
      navigate("miniapp-contribution-intake", "content/contribution/index");
    }
    if (action === "guide-toggle") { state.guideOpen = !state.guideOpen; renderKeepingPanelPosition(); }
    if (action === "evidence") {
      state.evidenceOpen = !state.evidenceOpen;
      target.setAttribute("aria-expanded", String(state.evidenceOpen));
      const detail = root.querySelector(`#${target.getAttribute("aria-controls")}`);
      if (detail) detail.hidden = !state.evidenceOpen;
    }
    if (action === "object-list") { state.objectListOpen = !state.objectListOpen; render(); }
    if (action === "orientation-recover") { state.general = "ready"; render(); announce("方向检测已恢复"); }
    if (action === "go-settings") navigate("miniapp-my-library", "settings");
    if (action === "go-plan") navigate("miniapp-my-library", "plan/detail");
    if (action === "go-profile") navigate("miniapp-profile-content", "profile/links");
    if (action === "go-import") navigate("miniapp-profile-content", "content/import");
    if (action === "plan-save") showNotice("计划已保存。");
    if (action === "product-theme" && !suppressModeClick) selectDisplayMode(target.dataset.value, event.detail > 0);
    if (action === "setting-switch") { const key = target.dataset.key; state.switches[key] = !state.switches[key]; render(); }
    if (action === "profile-open") { state.routeNotice = "外部链接打开暂不可用；草稿保持不变。"; showNotice(state.routeNotice); }
    if (action === "profile-copy") showNotice("链接已复制。");
    if (action === "import-submit") { state.general = "pending"; render(); announce("内容已进入待审核状态"); }
    if (action === "contribution-kind-choice") { state.contributionKind = target.dataset.value; render(); }
    if (action === "contribution-context") { state.contributionSpotMode = target.dataset.value; render(); }
    if (action === "contribution-topic") { const value = target.dataset.value; state.contributionTopics.has(value) ? state.contributionTopics.delete(value) : state.contributionTopics.add(value); state.contributionTouched.add("topics"); render(); }
    if (action === "media-add") addContributionMedia();
    if (action === "media-remove") { state.contributionMedia = state.contributionMedia.filter(item => item.id !== target.dataset.mediaId); if (!state.contributionMedia.length) state.contributionMediaRights = false; render(); }
    if (action === "media-retry") retryContributionMedia(target.dataset.mediaId);
    if (action === "contribution-submit") { event.preventDefault(); submitContribution(); }
    if (action === "recover") { state.general = "ready"; render(); announce("已恢复到可用状态"); }
    if (action === "notice-close") { state.notice = ""; render(); }
    if (searchDeferredCompositionCommit && state.route === "spot/search" && !searchExitInFlight) {
      searchDeferredCompositionCommit = false;
      const scrollTop = root.querySelector(".search-content")?.scrollTop || 0;
      render();
      requestAnimationFrame(() => { const scroller = root.querySelector(".search-content"); if (scroller) scroller.scrollTop = scrollTop; });
    }
  });

  root.addEventListener("input", event => {
    const target = event.target;
    if (target.id === "spot-search-input") {
      state.query = target.value;
      if (!searchSuppressCompositionReopen) setSearchSuggestionsOpen(true, false);
      if (!searchComposing) {
        const scrollTop = root.querySelector(".search-content")?.scrollTop || 0;
        render();
        requestAnimationFrame(() => {
          const input = root.querySelector("#spot-search-input");
          const scroller = root.querySelector(".search-content");
          if (scroller) scroller.scrollTop = scrollTop;
          if (input) { focusWithoutScroll(input); input.setSelectionRange(input.value.length, input.value.length); }
        });
      }
    }
    if (target.id === "plan-name") state.drafts.plan = target.value;
    if (target.id === "profile-url") { state.drafts.profileUrl = target.value; render(); requestAnimationFrame(() => focusWithoutScroll(root.querySelector("#profile-url"))); }
    if (target.id === "import-source") state.drafts.importSource = target.value;
    if (target.id === "import-body") state.drafts.importBody = target.value;
    if (target.id === "observed-at") state.drafts.observedAt = target.value;
    if (target.id === "contribution-evidence") state.drafts.evidence = target.value;
  });

  root.addEventListener("focusin", event => {
    if (event.target.id === "spot-search-input") setSearchSuggestionsOpen(true, false);
  });

  root.addEventListener("compositionstart", event => {
    if (event.target.id === "spot-search-input") searchComposing = true;
  });

  root.addEventListener("compositionend", event => {
    if (event.target.id !== "spot-search-input") return;
    searchComposing = false;
    state.query = event.target.value;
    if (searchSuppressCompositionReopen) {
      searchSuppressCompositionReopen = false;
      setSearchSuggestionsOpen(false, false);
      searchDeferredCompositionCommit = true;
      return;
    }
    setSearchSuggestionsOpen(true, false);
    render();
    requestAnimationFrame(() => focusWithoutScroll(root.querySelector("#spot-search-input")));
  });

  root.addEventListener("change", event => {
    const target = event.target;
    if (target.matches("[data-import-right]")) { target.checked ? state.importRights.add(target.dataset.importRight) : state.importRights.delete(target.dataset.importRight); render(); }
    if (target.matches("[data-topic]")) { target.checked ? state.contributionTopics.add(target.dataset.topic) : state.contributionTopics.delete(target.dataset.topic); render(); }
    if (target.name === "contribution-kind") { state.contributionKind = target.value; render(); }
    if (target.id === "location-consent") { state.contributionLocationConsent = target.checked; state.contributionTouched.add("location"); render(); }
    if (target.id === "media-rights") { state.contributionMediaRights = target.checked; state.contributionTouched.add("rights"); render(); }
  });

  root.addEventListener("focusout", event => {
    if (event.target.id === "contribution-evidence") {
      state.contributionTouched.add("evidence");
      if (!state.drafts.evidence.trim()) setTimeout(() => { if (state.route === "content/contribution/index") render(); }, 0);
    }
  });

  root.addEventListener("submit", event => {
    if (event.target.closest(".contribution-form")) event.preventDefault();
  });

  root.addEventListener("keydown", event => {
    const panelHandle = event.target.closest(".panel-handle");
    if (panelHandle && ["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      const order = ["small", "medium", "large"];
      let index = order.indexOf(state.panelExtent);
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = 2;
      else index = Math.max(0, Math.min(2, index + (event.key === "ArrowUp" ? 1 : -1)));
      event.preventDefault();
      applyPanelExtent(order[index]);
      announce(`信息面板 ${order[index]}`);
      return;
    }
    const ruler = event.target.closest("[data-ruler]");
    if (ruler) {
      if (["ArrowLeft", "ArrowDown"].includes(event.key)) { event.preventDefault(); stepTime(-1); }
      if (["ArrowRight", "ArrowUp"].includes(event.key)) { event.preventDefault(); stepTime(1); }
      if (event.key === "Home") { event.preventDefault(); state.timeIndex = 0; renderKeepingPanelPosition(); }
      if (event.key === "End") { event.preventDefault(); state.timeIndex = timeline.length - 1; renderKeepingPanelPosition(); }
    }
    const modeStop = event.target.closest(".mode-stop");
    if (modeStop && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      const modes = ["day", "night", "observation"];
      let index = modes.indexOf(state.theme);
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = 2;
      else index = Math.max(0, Math.min(2, index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1)));
      event.preventDefault();
      selectDisplayMode(modes[index], false);
      requestAnimationFrame(() => focusWithoutScroll(root.querySelector(`.mode-stop[data-value="${modes[index]}"]`)));
      return;
    }
    const radio = event.target.closest('[role="radio"]');
    if (radio && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      const group = Array.from(radio.parentElement.querySelectorAll('[role="radio"]'));
      let index = group.indexOf(radio);
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = group.length - 1;
      else index = (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + group.length) % group.length;
      event.preventDefault(); focusWithoutScroll(group[index]); group[index].click();
    }
    const searchInput = event.target.closest("#spot-search-input");
    if (searchInput && state.suggestionsOpen && event.key === "ArrowDown") {
      const firstOption = root.querySelector("#search-suggestions [role='option']");
      if (firstOption) { event.preventDefault(); focusWithoutScroll(firstOption); }
    }
    const suggestion = event.target.closest("#search-suggestions [role='option']");
    if (suggestion && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      const options = Array.from(root.querySelectorAll("#search-suggestions [role='option']"));
      let index = options.indexOf(suggestion);
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = options.length - 1;
      else index = (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      event.preventDefault();
      focusWithoutScroll(options[index]);
    }
  });

  root.addEventListener("pointerdown", event => {
    clearTimeout(mapSpaceClickTimer);
    mapSpaceClickArmed = false;
    const mapSpace = event.target.closest('[data-action="map-space"]');
    const directMapSpace = mapSpace && event.target.closest("[data-action]") === mapSpace && !event.target.closest(".spot-panel, .layer-sheet");
    mapSpacePointer = directMapSpace ? { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 } : null;
    if (state.route === "spot/search" && !event.target.closest(".search-frame, .query-overlay")) {
      searchSuppressCompositionReopen = searchComposing;
      closeSearchSuggestions(true);
    }
    const searchPage = event.target.closest(".search-page");
    if (searchPage && event.clientX - root.getBoundingClientRect().left <= 16) {
      searchPage.setPointerCapture(event.pointerId);
      searchEdgeDrag = { page: searchPage, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 };
    }
    const edgePanel = event.target.closest('.spot-panel[data-extent="large"]');
    if (edgePanel && !event.target.closest("button, input, textarea, select, [data-ruler]") && event.clientX - root.getBoundingClientRect().left <= 16) {
      edgePanel.setPointerCapture(event.pointerId);
      panelEdgeDrag = { panel: edgePanel, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 };
      return;
    }
    const modeTrack = event.target.closest("[data-mode-track]");
    if (modeTrack) {
      modeDrag = { element: modeTrack, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startIndex: ["day", "night", "observation"].indexOf(state.theme), active: false };
      return;
    }
    const ruler = event.target.closest("[data-ruler]");
    if (ruler) {
      ruler.setPointerCapture(event.pointerId);
      rulerDrag = { element: ruler, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startScroll: ruler.scrollLeft, startIndex: state.timeIndex, preview: state.timeIndex, active: false };
      return;
    }
    const handleHot = event.target.closest("[data-handle-drag]");
    if (handleHot) {
      const panel = root.querySelector(".spot-panel");
      if (!panel) return;
      panel.setPointerCapture(event.pointerId);
      panelDrag = { panel, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastY: event.clientY, lastAt: performance.now(), velocity: 0, startHeight: panel.getBoundingClientRect().height, active: false };
    }
  });

  root.addEventListener("pointermove", event => {
    if (mapSpacePointer && event.pointerId === mapSpacePointer.pointerId) {
      mapSpacePointer.dx = event.clientX - mapSpacePointer.startX;
      mapSpacePointer.dy = event.clientY - mapSpacePointer.startY;
    }
    if (searchEdgeDrag && event.pointerId === searchEdgeDrag.pointerId) {
      searchEdgeDrag.dx = event.clientX - searchEdgeDrag.startX;
      searchEdgeDrag.dy = event.clientY - searchEdgeDrag.startY;
      if (searchEdgeDrag.dx > 0 && Math.abs(searchEdgeDrag.dx) > Math.abs(searchEdgeDrag.dy)) event.preventDefault();
      return;
    }
    if (panelEdgeDrag && event.pointerId === panelEdgeDrag.pointerId) {
      panelEdgeDrag.dx = event.clientX - panelEdgeDrag.startX;
      panelEdgeDrag.dy = event.clientY - panelEdgeDrag.startY;
      if (panelEdgeDrag.dx > 0 && Math.abs(panelEdgeDrag.dx) > Math.abs(panelEdgeDrag.dy)) {
        panelEdgeDrag.panel.style.transform = `translateX(${Math.min(72, panelEdgeDrag.dx)}px)`;
        event.preventDefault();
      }
      return;
    }
    if (modeDrag && event.pointerId === modeDrag.pointerId) {
      const dx = event.clientX - modeDrag.startX;
      const dy = event.clientY - modeDrag.startY;
      if (!modeDrag.active) {
        if (Math.hypot(dx, dy) < 8) return;
        if (Math.abs(dx) <= Math.abs(dy)) { modeDrag = null; return; }
        modeDrag.active = true;
        modeDrag.element.setPointerCapture(event.pointerId);
        modeDrag.element.dataset.dragging = "true";
      }
      const stationWidth = Math.max(1, modeDrag.element.clientWidth / 3);
      const position = Math.max(0, Math.min(2, modeDrag.startIndex + dx / stationWidth));
      modeDrag.position = position;
      modeDrag.element.style.setProperty("--mode-position", String(position));
      event.preventDefault();
      return;
    }
    if (rulerDrag && event.pointerId === rulerDrag.pointerId) {
      const dx = event.clientX - rulerDrag.startX;
      const dy = event.clientY - rulerDrag.startY;
      if (!rulerDrag.active) {
        if (Math.hypot(dx, dy) < 8) return;
        if (Math.abs(dx) <= Math.abs(dy)) { rulerDrag = null; return; }
        rulerDrag.active = true;
      }
      const maxScroll = Math.max(0, rulerDrag.element.scrollWidth - rulerDrag.element.clientWidth);
      rulerDrag.element.scrollLeft = Math.max(0, Math.min(maxScroll, rulerDrag.startScroll - dx));
      rulerDrag.preview = Math.max(0, Math.min(timeline.length - 1, rulerDrag.element.scrollLeft / 17));
      updateRulerElement(rulerDrag.element, rulerDrag.preview);
      event.preventDefault();
      return;
    }
    if (panelDrag && event.pointerId === panelDrag.pointerId) {
      const totalX = event.clientX - panelDrag.startX;
      const totalY = event.clientY - panelDrag.startY;
      if (!panelDrag.active) {
        if (Math.hypot(totalX, totalY) < 8) return;
        if (Math.abs(totalY) <= Math.abs(totalX)) {
          panelDrag = null;
          return;
        }
        panelDrag.active = true;
        cancelAnimationFrame(panelPresentationFrame);
        panelPresentationFrame = null;
        panelDrag.panel.dataset.dragging = "true";
      }
      const now = performance.now();
      const dy = event.clientY - panelDrag.lastY;
      panelDrag.velocity = dy / Math.max(1, now - panelDrag.lastAt);
      panelDrag.lastY = event.clientY;
      panelDrag.lastAt = now;
      const appHeight = Math.max(0, root.getBoundingClientRect().height - 62);
      const small = 116;
      const medium = Math.min(350, Math.max(250, appHeight * .52));
      const large = appHeight;
      const height = Math.max(small, Math.min(large, panelDrag.startHeight + panelDrag.startY - event.clientY));
      const progress = height <= medium ? ((height - small) / Math.max(1, medium - small)) * .5 : .5 + ((height - medium) / Math.max(1, large - medium)) * .5;
      panelDrag.panel.style.height = `${height}px`;
      setPanelPresentation(progress);
      panelDrag.progress = progress;
      event.preventDefault();
    }
  });

  function endPointer(event, cancelled) {
    if (mapSpacePointer && event.pointerId === mapSpacePointer.pointerId) {
      const mapSpace = event.target.closest?.('[data-action="map-space"]');
      const directMapSpace = mapSpace && event.target.closest?.("[data-action]") === mapSpace && !event.target.closest?.(".spot-panel, .layer-sheet");
      mapSpaceClickArmed = !cancelled && directMapSpace && Math.hypot(mapSpacePointer.dx, mapSpacePointer.dy) < 8;
      mapSpacePointer = null;
      clearTimeout(mapSpaceClickTimer);
      mapSpaceClickTimer = setTimeout(() => { mapSpaceClickArmed = false; }, 0);
    }
    if (searchEdgeDrag && event.pointerId === searchEdgeDrag.pointerId) {
      const leaveSearch = !cancelled && searchEdgeDrag.dx >= 44 && Math.abs(searchEdgeDrag.dy) < 56;
      searchEdgeDrag = null;
      if (leaveSearch) requestSearchExit();
      return;
    }
    if (panelEdgeDrag && event.pointerId === panelEdgeDrag.pointerId) {
      const collapse = !cancelled && panelEdgeDrag.dx >= 44 && Math.abs(panelEdgeDrag.dy) < 56;
      panelEdgeDrag.panel.style.removeProperty("transform");
      panelEdgeDrag = null;
      if (collapse) {
        applyPanelExtent("medium");
        announce("已返回中档地点信息");
      }
      return;
    }
    if (modeDrag && event.pointerId === modeDrag.pointerId) {
      const drag = modeDrag;
      modeDrag = null;
      delete drag.element.dataset.dragging;
      if (!drag.active) return;
      suppressModeClick = true;
      setTimeout(() => { suppressModeClick = false; }, 0);
      const index = cancelled ? drag.startIndex : Math.max(0, Math.min(2, Math.round(drag.position == null ? drag.startIndex : drag.position)));
      selectDisplayMode(["day", "night", "observation"][index], false);
      return;
    }
    if (rulerDrag && event.pointerId === rulerDrag.pointerId) {
      const drag = rulerDrag;
      rulerDrag = null;
      if (cancelled) {
        state.timeIndex = drag.startIndex;
        drag.element.scrollTo({ left: state.timeIndex * 17, behavior: "auto" });
        updateRulerElement(drag.element, state.timeIndex);
        announce(`已恢复观测时间 ${timeline[state.timeIndex].label}`);
      } else if (drag.active) {
        state.timeIndex = Math.max(0, Math.min(timeline.length - 1, Math.round(drag.preview)));
        drag.element.scrollTo({ left: state.timeIndex * 17, behavior: state.motion === "reduced" ? "auto" : "smooth" });
        updateAllRulers(state.timeIndex);
        announce(`观测时间 ${timeline[state.timeIndex].label}`);
      }
      return;
    }
    if (panelDrag && event.pointerId === panelDrag.pointerId) {
      if (!panelDrag.active) {
        panelDrag = null;
        return;
      }
      let progress = panelDrag.progress == null ? ({ small: 0, medium: .5, large: 1 }[state.panelExtent]) : panelDrag.progress;
      if (cancelled) progress = { small: 0, medium: .5, large: 1 }[state.panelExtent];
      else if (panelDrag.velocity < -.45) progress += .26;
      else if (panelDrag.velocity > .45) progress -= .26;
      const nextExtent = progress < .25 ? "small" : progress < .75 ? "medium" : "large";
      const panel = panelDrag.panel;
      const fromProgress = Math.max(0, Math.min(1, progress));
      state.panelExtent = nextExtent;
      panel.dataset.extent = nextExtent;
      syncPanelHandleSemantics(panel, nextExtent);
      panel.getBoundingClientRect();
      delete panel.dataset.dragging;
      if (fromProgress > panelProgressForExtent(nextExtent)) {
        panel.dataset.presenting = "true";
        setTimeout(() => { if (panel.isConnected) delete panel.dataset.presenting; }, 340);
      }
      panelDrag = null;
      requestAnimationFrame(() => {
        panel.style.removeProperty("height");
        animatePanelPresentation(fromProgress, panelProgressForExtent(nextExtent));
      });
      announce(`信息面板 ${state.panelExtent}`);
    }
  }

  root.addEventListener("pointerup", event => endPointer(event, false));
  root.addEventListener("pointercancel", event => {
    mapSpacePointer = null;
    mapSpaceClickArmed = false;
    endPointer(event, true);
  });

  root.addEventListener("scroll", event => {
    if (event.target === root.querySelector(".map-scene")) {
      lockMapSceneOrigin();
      return;
    }
    const ruler = event.target.closest?.("[data-ruler]");
    if (!ruler) return;
    const preview = Math.max(0, Math.min(timeline.length - 1, ruler.scrollLeft / 17));
    if (rulerDrag && rulerDrag.element === ruler) rulerDrag.preview = preview;
    updateRulerElement(ruler, preview);
    if (rulerDrag && rulerDrag.element === ruler && rulerDrag.active) return;
    clearTimeout(rulerScrollTimers.get(ruler));
    rulerScrollTimers.set(ruler, setTimeout(() => {
      state.timeIndex = Math.round(preview);
      ruler.scrollTo({ left: state.timeIndex * 17, behavior: state.motion === "reduced" ? "auto" : "smooth" });
      updateRulerElement(ruler, state.timeIndex);
      root.querySelectorAll(".layer-summary time").forEach(element => { element.textContent = timeline[state.timeIndex].label; });
      announce(`观测时间 ${timeline[state.timeIndex].label}`);
    }, 100));
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (state.suggestionsOpen) {
      closeSearchSuggestions(false);
      return;
    }
    back();
  });

  window.addEventListener("popstate", () => {
    if (layerHistoryPopExpected) {
      layerHistoryPopExpected = false;
      return;
    }
    if (searchHistoryPopExpected) {
      searchHistoryPopExpected = false;
      searchHistoryArmed = false;
      clearTimeout(searchHistoryFallbackTimer);
      searchHistoryFallbackTimer = null;
      return;
    }
    if (state.route === "spot/search" && searchExitInFlight && searchHistoryFallbackDebt > 0) {
      searchHistoryFallbackDebt -= 1;
      return;
    }
    if (state.route === "spot/search") {
      searchHistoryArmed = false;
      exitSearch(false);
      return;
    }
    if (searchHistoryFallbackDebt > 0) {
      searchHistoryFallbackDebt -= 1;
      return;
    }
    if (state.bottomPresentation === "layer-sheet") {
      layerHistoryArmed = false;
      closeLayerSheet(true);
      return;
    }
    back();
  });

  surfaceSelect.addEventListener("change", () => {
    const surface = surfaceSelect.value;
    if (surface === "miniapp-sky-orientation" && !state.currentSpotId) state.currentSpotId = spots[0].id;
    navigate(surface, routes[surface][0].value);
  });
  routeSelect.addEventListener("change", () => navigate(state.surface, routeSelect.value));
  stateSelect.addEventListener("change", () => { state.general = stateSelect.value; render(); });
  document.querySelectorAll(".audit-panel button[data-theme-value]").forEach(button => button.addEventListener("click", () => { state.theme = button.dataset.themeValue; render(); }));
  document.querySelectorAll(".audit-panel button[data-viewport]").forEach(button => button.addEventListener("click", () => { state.viewport = Number(button.dataset.viewport); render(); }));
  document.querySelectorAll(".audit-panel button[data-text-scale]").forEach(button => button.addEventListener("click", () => { state.textScale = Number(button.dataset.textScale); render(); }));
  document.querySelectorAll(".audit-panel button[data-motion-value]").forEach(button => button.addEventListener("click", () => { state.motion = button.dataset.motionValue; render(); }));
  document.querySelectorAll(".audit-panel button[data-transparency-value]").forEach(button => button.addEventListener("click", () => { state.transparency = button.dataset.transparencyValue; render(); }));
  ["alpha", "beta", "gamma"].forEach(key => document.getElementById(`pose-${key}`).addEventListener("input", event => { state.pose[key] = Number(event.target.value); updatePose(); }));

  render();
}());
