"""Unweighted local shape diagnostics, never inference from independent pixels.

Affine nuisance terms belong to the raw display sampling view. Its recorded
CSR means map those terms before fitting the current conditional unit model.
No source sky subtraction, native variance, threshold or centre optimisation.
"""
from dataclasses import dataclass
import numpy as np

@dataclass(frozen=True)
class DescriptiveProfile:
    coefficients: np.ndarray
    prediction: np.ndarray
    residual: np.ndarray
    rank: int
    singular_values: np.ndarray
    plane_only_coefficients: np.ndarray
    plane_only_prediction: np.ndarray

def affine_basis(x,y,anchor):
    x,y=np.asarray(x,dtype=float),np.asarray(y,dtype=float)
    if x.shape!=y.shape or not np.isfinite(x).all() or not np.isfinite(y).all() or not np.isfinite(anchor).all():
        raise ValueError('invalid_real_coordinates')
    return np.stack((np.ones(x.shape),(x-anchor[0])/12,(y-anchor[1])/12),axis=-1)

def recorded_affine_basis(x,y,anchor,offsets,selected):
    basis=affine_basis(x,y,anchor).reshape(-1,3)
    offsets,selected=np.asarray(offsets),np.asarray(selected)
    if offsets.ndim!=1 or selected.ndim!=1 or not np.issubdtype(offsets.dtype,np.integer) or not np.issubdtype(selected.dtype,np.integer):
        raise ValueError('invalid_recorded_selection')
    if len(offsets)<2 or offsets[0]!=0 or offsets[-1]!=len(selected) or (np.diff(offsets)<=0).any() or (selected<0).any() or (selected>=len(basis)).any():
        raise ValueError('missing_recorded_selection')
    return np.stack([basis[selected[start:end]].mean(axis=0) for start,end in zip(offsets[:-1],offsets[1:])])

def descriptive_profile(data,unit,basis,usable):
    data,unit=np.asarray(data,dtype=float),np.asarray(unit,dtype=float)
    basis,usable=np.asarray(basis,dtype=float),np.asarray(usable,dtype=bool)
    if data.ndim!=1 or unit.shape!=data.shape or usable.shape!=data.shape or basis.shape!=(len(data),3):
        raise ValueError('inconsistent_profile_contract')
    if not np.isfinite(basis).all() or not np.isfinite(data[usable]).all() or not np.isfinite(unit[usable]).all():
        raise ValueError('nonfinite_admitted_profile')
    if usable.sum()<=4:return None
    design=np.column_stack((unit,basis));a=design[usable];b=data[usable]
    coefficients,_,rank,singular=np.linalg.lstsq(a,b,rcond=None)
    if rank!=4:return None
    plane,_,plane_rank,_=np.linalg.lstsq(basis[usable],b,rcond=None)
    if plane_rank!=3:return None
    prediction=design@coefficients;residual=data-prediction
    return DescriptiveProfile(coefficients,prediction,residual,int(rank),singular,plane,basis@plane)
