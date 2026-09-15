import unittest
from astropy.table import Table
from build_bsc5p import names_by_hr


def html(rows):
    return ('<table><tr><th>proper names</th><th>Designation</th><th>HIP</th><th>Bayer ID</th></tr>' +
            ''.join('<tr>'+''.join('<td>'+str(cell)+'</td>' for cell in row)+'</tr>' for row in rows)+'</table>').encode('utf-8')


class NameIdentityTests(unittest.TestCase):
    def test_hr_hd_and_bayer_preserve_physical_identity(self):
        table = Table(rows=[(2491,48915,'9Alp CMa'), (3,100,'Bet1Sco'), (4,101,'Bet2Sco')],names=['hr','hd','alt_name'])
        self.assertEqual(names_by_hr(html([['Sirius','HR 2491','32349','α CMa']]),table), {2491:('Sirius','32349')})
        self.assertEqual(names_by_hr(html([['Sirius','HD 48915','32349','α CMa']]),table), {2491:('Sirius','32349')})
        self.assertEqual(names_by_hr(html([['Sirius','* alf CMa','32349','α CMa']]),table), {2491:('Sirius','32349')})
        self.assertEqual(names_by_hr(html([['Acrab','* bet Sco','78820','β1 Sco']]),table), {3:('Acrab','78820')})
        self.assertEqual(names_by_hr(html([['Unresolved','* bet Sco','','β Sco']]),table), {})

    def test_ambiguous_hd_or_conflicting_names_never_choose_first(self):
        table = Table(rows=[(3,100,'Bet1Sco'), (4,100,'Bet2Sco')],names=['hr','hd','alt_name'])
        self.assertEqual(names_by_hr(html([['Unresolved','HD 100','','β1 Sco']]),table), {})
        self.assertEqual(names_by_hr(html([['One','HR 3','',''],['Two','HR 3','','']]),table), {})
        self.assertEqual(names_by_hr(html([['One','HR 3','',''],['One','HR 3','','']]),table), {3:('One',None)})


if __name__ == '__main__': unittest.main()
