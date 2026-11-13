import { describe, expect, it } from 'vitest';
import {
  PLACEMENT_ALL,
  PLACEMENT_STAFF,
  POSITION_TO_LEVEL,
  filterGangsByPosition,
  gangMatchesPosition,
  getEmployeePlacementPatch,
  getPlacementError,
  getPlacementRules,
  getPositionChangePatch,
  normalizeEmployeeId,
} from './placementRules';

describe('placementRules', () => {
  it('maps every position to a level', () => {
    expect(POSITION_TO_LEVEL['KR.TRANS']).toBe('KRT');
    expect(POSITION_TO_LEVEL['MANDOR1']).toBe('MD1');
    expect(POSITION_TO_LEVEL.ADMIN).toBe('ADM');
  });

  it('allows ALL per jabatan', () => {
    const bod = getPlacementRules('BOD');
    expect([bod.fcbaAll, bod.afdelingAll, bod.gangAll]).toEqual([true, true, true]);

    const em = getPlacementRules('EM');
    expect([em.fcbaAll, em.afdelingAll, em.gangAll]).toEqual([false, true, true]);

    const asisten = getPlacementRules('ASISTEN');
    expect([asisten.fcbaAll, asisten.afdelingAll, asisten.gangAll]).toEqual([false, false, true]);

    const mandor = getPlacementRules('MANDOR1');
    expect([mandor.gangAll, mandor.gangRequired, mandor.idRequired]).toEqual([true, true, true]);

    expect(getPlacementRules('KR.TRANS').gangPrefixes).toEqual(['MT', 'TM']);
    expect(getPlacementRules('KR.PANEN').gangPrefixes).toEqual(['MD']);
    expect(getPlacementRules('MD.PANEN').gangPrefixes).toEqual(['MD']);
    expect(getPlacementRules('UNKNOWN')).toMatchObject({ gangRequired: false, idRequired: false });
  });

  it('only offers STAFF as employee id for positions that do not require it', () => {
    for (const position of ['ADMIN', 'EM', 'BOD', 'KASIE', 'ASISTEN']) {
      expect(getPlacementRules(position).staffIdAllowed).toBe(true);
      expect(getPlacementRules(position).idRequired).toBe(false);
    }
    expect(getPlacementRules('MANDOR1').staffIdAllowed).toBeFalsy();
    expect(getPlacementRules('KR.TRANS').staffIdAllowed).toBeFalsy();
    expect(normalizeEmployeeId(PLACEMENT_STAFF)).toBe('');
    expect(normalizeEmployeeId(' 06-1 ')).toBe('06-1');
    expect(normalizeEmployeeId('')).toBe('');
  });

  it('filters gang options by position prefix', () => {
    const options = ['MT041', 'TM041', 'MD041', 'PN041'].map(value => ({ value, label: value }));
    expect(filterGangsByPosition(options, getPlacementRules('KR.PANEN')).map(o => o.value)).toEqual(
      ['MD041']
    );
    expect(filterGangsByPosition(options, getPlacementRules('KR.TRANS')).map(o => o.value)).toEqual(
      ['MT041', 'TM041']
    );
    expect(filterGangsByPosition(options, getPlacementRules('ASISTEN'))).toHaveLength(4);
    expect(gangMatchesPosition('MD041', getPlacementRules('KR.PANEN'))).toBe(true);
    expect(gangMatchesPosition('PN041', getPlacementRules('KR.PANEN'))).toBe(false);
  });

  it('resets values that the new position does not allow', () => {
    expect(
      getPositionChangePatch(
        { fcba: PLACEMENT_ALL, afdeling: PLACEMENT_ALL, gangcode: 'ALL' },
        'KR.PANEN'
      )
    ).toEqual({ fcba: '', afdeling: '', gangcode: '', idkaryawan: '' });

    expect(
      getPositionChangePatch({ fcba: 'MTE', afdeling: 'AFD-04', gangcode: 'PN041' }, 'KR.PANEN')
    ).toEqual({ fcba: 'MTE', afdeling: 'AFD-04', gangcode: '', idkaryawan: '' });

    expect(
      getPositionChangePatch({ fcba: 'MTE', afdeling: 'AFD-04', gangcode: 'MD041' }, 'KR.PANEN')
    ).toEqual({ fcba: 'MTE', afdeling: 'AFD-04', gangcode: 'MD041', idkaryawan: '' });

    expect(
      getPositionChangePatch({ fcba: PLACEMENT_ALL, afdeling: '', gangcode: '' }, 'EM')
    ).toEqual({ fcba: '', afdeling: '', gangcode: '', idkaryawan: '' });

    expect(
      getPositionChangePatch({ fcba: PLACEMENT_ALL, afdeling: '', gangcode: '' }, 'BOD')
    ).toEqual({ fcba: PLACEMENT_ALL, afdeling: '', gangcode: '', idkaryawan: '' });

    expect(getPositionChangePatch({ idkaryawan: PLACEMENT_STAFF }, 'MANDOR1').idkaryawan).toBe('');
    expect(getPositionChangePatch({ idkaryawan: PLACEMENT_STAFF }, 'ADMIN').idkaryawan).toBe(
      PLACEMENT_STAFF
    );
  });

  it('auto-fills placement from the selected employee', () => {
    const mtOptions = ['MT041', 'TM041'].map(value => ({ value, label: value }));
    const employee = {
      fccode: '06-041210-250901-0414',
      fcba: 'MTE',
      sectionname: 'AFD-04',
      gangcode: 'TM041',
    };

    expect(getEmployeePlacementPatch(employee, 'KR.TRANS', mtOptions)).toEqual({
      idkaryawan: '06-041210-250901-0414',
      fcba: 'MTE',
      afdeling: 'AFD-04',
      gangcode: 'MT041',
    });

    expect(getEmployeePlacementPatch(employee, 'KR.PANEN', mtOptions).gangcode).toBe('');
    expect(getEmployeePlacementPatch(employee, 'KR.TRANS', []).gangcode).toBe('MT041');
    expect(getEmployeePlacementPatch(employee, 'MANDOR1', mtOptions).gangcode).toBe('TM041');
    expect(
      getEmployeePlacementPatch(employee, 'KR.TRANS', mtOptions, { fcbaLocked: true })
    ).not.toHaveProperty('fcba');
  });

  it('requires gang and employee id for the configured positions', () => {
    expect(getPlacementError({ position: 'KR.PANEN', gangcode: '', idkaryawan: '' })).toBe('gang');
    expect(getPlacementError({ position: 'KR.PANEN', gangcode: 'MD041', idkaryawan: '' })).toBe(
      'id'
    );
    expect(
      getPlacementError({ position: 'KR.PANEN', gangcode: 'MD041', idkaryawan: '06-1' })
    ).toBeNull();
    expect(getPlacementError({ position: 'ASISTEN', gangcode: '', idkaryawan: '' })).toBeNull();
    expect(
      getPlacementError({ position: 'MANDOR1', gangcode: 'G1', idkaryawan: PLACEMENT_STAFF })
    ).toBe('id');
    expect(getPlacementError({ position: '', gangcode: '', idkaryawan: '' })).toBeNull();
  });
});
